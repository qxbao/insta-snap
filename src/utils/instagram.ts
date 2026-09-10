import { ActionType, ExtensionMessage } from "../constants/actions"
import { ErrorBoundary, HTTPStatus } from "../constants/http"
import { Minute, Second } from "../constants/time"
import { useUIStore } from "../stores/ui.store"
import {
  InstagramAPIHeader,
  InstagramV1FollowResponse,
  InstagramWebProfileInfoResponse,
  UserNode,
} from "../types/instapi"
import { createLogger, Logger } from "./logger"
import { browser } from "./polyfill"

const REST_PAGE_SIZE = 100

const logger = createLogger("InstaSnap:Instagram")

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    // eslint-disable-next-line no-magic-numbers
    const r = (Math.random() * 16) | 0
    // eslint-disable-next-line no-magic-numbers
    const v = c === "x" ? r : (r & 0x3) | 0x8
    // eslint-disable-next-line no-magic-numbers
    return v.toString(16)
  })
}

function buildFollowersEndpoint(uid: string, maxId?: string | null, rankToken?: string, query?: string): string {
  let url = `https://www.instagram.com/api/v1/friendships/${uid}/followers/?count=${REST_PAGE_SIZE}&search_surface=follow_list_page`
  if (query) {
    url += `&query=${encodeURIComponent(query)}`
  }
  if (rankToken) {
    url += `&rank_token=${encodeURIComponent(rankToken)}`
  }
  if (maxId) {
    url += `&max_id=${encodeURIComponent(maxId)}`
  }
  return url
}

function buildFollowingEndpoint(uid: string, maxId?: string | null, rankToken?: string, query?: string): string {
  let url = `https://www.instagram.com/api/v1/friendships/${uid}/following/?count=${REST_PAGE_SIZE}&search_surface=follow_list_page`
  if (query) {
    url += `&query=${encodeURIComponent(query)}`
  }
  if (rankToken) {
    url += `&rank_token=${encodeURIComponent(rankToken)}`
  }
  if (maxId) {
    url += `&max_id=${encodeURIComponent(maxId)}`
  }
  return url
}

function findAppId(): string {
  const bodyContent = document.querySelector("body")?.innerHTML
  const appIdMatch = bodyContent?.match(/"APP_ID":"(\d+)"/)
  return appIdMatch ? appIdMatch[1] : ""
}

async function findUserId(username: string): Promise<string | null> {
  try {
    const response = await fetchWithRetry(
      `https://www.instagram.com/${username}`,
      {},
      {
        maxRetries: 2,
        retryDelay: 1000,
        timeout: 10000,
      },
    )
    if (!response.ok) {
      return null
    }
    const text = await response.text()
    const userId = text?.match(/"profile_id":"(\d+)"/)
    return userId ? userId[1] : ""
  } catch (error) {
    logger.error("Failed to find user ID:", error)
    return null
  }
}

function exportCSRFToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/)
  return match ? match[1] : ""
}

/**
 * Build headers for Instagram API requests.
 * @param appId Instagram App ID
 * @return InstagramAPIHeader Headers object
 * */
function buildHeaders(appId: string, csrfToken: string, wwwClaim: string): InstagramAPIHeader {
  const headers: InstagramAPIHeader = {} as InstagramAPIHeader

  // Fixed values
  headers["accept"] = "*/*"
  headers["accept-language"] = "vi,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,ru;q=0.6"
  headers["sec-fetch-dest"] = "empty"
  headers["sec-fetch-mode"] = "cors"
  headers["sec-fetch-site"] = "same-origin"

  // Dynamic values
  headers["x-ig-www-claim"] = wwwClaim
  headers["x-ig-app-id"] = appId
  headers["x-csrftoken"] = csrfToken
  return headers
}

/**
 * Custom fetch function for Instagram API requests with retry logic.
 * @param input URL or RequestInfo
 * @param appId Instagram App ID
 * @param init Optional RequestInit object
 * @returns Promise<Response> Fetch response
 */
function IGFetch(
  input: URL | RequestInfo,
  appId: string = findAppId(),
  csrfToken: string = exportCSRFToken(),
  wwwClaim: string,
  init?: RequestInit,
): Promise<Response> {
  const url =
    typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url

  return fetchWithRetry(
    url,
    {
      headers: {
        ...buildHeaders(appId, csrfToken, wwwClaim),
      },
      credentials: "include",
      mode: "cors",
      ...init,
    },
    {
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 15000,
    },
  )
}

interface FetchOptions {
  maxRetries?: number
  retryDelay?: number
  timeout?: number
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  fetchOptions: FetchOptions = {},
): Promise<Response> {
  const { maxRetries = 3, retryDelay = 1000, timeout = 10000 } = fetchOptions

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.status === HTTPStatus.TooManyRequests) {
        const retryAfter = response.headers.get("Retry-After")
        const baseDelay = retryAfter ? parseInt(retryAfter) * Second : retryDelay
        // eslint-disable-next-line no-magic-numbers
        const exponentialDelay = baseDelay * Math.pow(2, attempt)
        const jitter = Math.random() * Second
        const delay = Math.min(exponentialDelay + jitter, Minute) // Max 60s

        if (attempt < maxRetries - 1) {
          logger.info(`Rate limited, retrying after ${delay}ms`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
      }

      if (!response.ok && response.status >= ErrorBoundary) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response
    } catch (error) {
      if (attempt === maxRetries - 1) throw error

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout")
      }
      // eslint-disable-next-line no-magic-numbers
      await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
    }
  }

  throw new Error("Max retries exceeded")
}

async function fetchCountViaGraphQL(
  userId: string,
  rqtype: "followers" | "following",
  appId: string,
  csrfToken: string,
  wwwClaim: string,
): Promise<number | null> {
  const hashes =
    rqtype === "followers"
      ? ["c76146de41bb0209fe918a345a767d99", "c76146de99bb02f6415203be841dd25a", "5882385336d63f0f93829557a0927f3d"]
      : ["5882385336d63f0f93829557a0927f3d", "d04b0a864b4b54837c0d870b0e77e076", "c76146de41bb0209fe918a345a767d99"]

  for (const hash of hashes) {
    const variables = JSON.stringify({
      id: userId,
      include_reel: true,
      fetch_mutual: true,
      first: 10,
    })
    const url = `https://www.instagram.com/graphql/query/?query_hash=${hash}&variables=${encodeURIComponent(variables)}`
    try {
      const response = await IGFetch(url, appId, csrfToken, wwwClaim)
      if (response.ok) {
        const data = await response.json()
        const user = data?.data?.user
        const edgeKey = rqtype === "followers" ? "edge_followed_by" : "edge_follow"
        if (user && user[edgeKey] && typeof user[edgeKey].count === "number") {
          logger.info(`Successfully retrieved ${rqtype} count (${user[edgeKey].count}) via query_hash ${hash}`)
          return user[edgeKey].count
        }
      }
    } catch (error) {
      logger.warn(`Failed to fetch ${rqtype} count via GraphQL query_hash ${hash}:`, error)
    }
  }
  return null
}

async function fetchUserCounts(
  username: string,
  userId: string,
  appId: string = findAppId(),
  csrfToken: string = exportCSRFToken(),
  wwwClaim: string = "",
): Promise<{ followersCount: number | null, followingCount: number | null }> {
  logger.info(`Fetching user counts for user ID ${userId} (@${username})...`)

  let followersCount = await fetchCountViaGraphQL(userId, "followers", appId, csrfToken, wwwClaim)
  let followingCount = await fetchCountViaGraphQL(userId, "following", appId, csrfToken, wwwClaim)

  if (followersCount == null || followingCount == null) {
    try {
      const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`
      const response = await IGFetch(url, appId, csrfToken, wwwClaim, {
        headers: {
          referer: `https://www.instagram.com/${username}/`,
        },
      })
      if (response.ok) {
        const data: InstagramWebProfileInfoResponse = await response.json()
        const user = data?.data?.user
        if (user) {
          if (followersCount == null && typeof user.edge_followed_by?.count === "number") {
            followersCount = user.edge_followed_by.count
          }
          if (followingCount == null && typeof user.edge_follow?.count === "number") {
            followingCount = user.edge_follow.count
          }
        }
      }
    } catch (error) {
      logger.error("Failed to fetch user counts via web_profile_info fallback:", error)
    }
  }

  logger.info(`Count retrieval finished: followersCount=${followersCount}, followingCount=${followingCount}`)
  return { followersCount, followingCount }
}

async function fetchUsers(
  userId: string,
  rqtype: "followers" | "following",
  appId: string,
  csrfToken: string,
  wwwClaim: string,
  targetCount?: number | null,
  logger?: Logger,
  store?: ReturnType<typeof useUIStore>,
): Promise<UserNode[] | false> {
  const buildEndpoint = rqtype === "followers" ? buildFollowersEndpoint : buildFollowingEndpoint

  logger?.info(
    `Fetching ${rqtype} using parallel REST v1 streams... Target count: ${targetCount ?? "unknown"}`,
  )

  store?.setLoading(true)
  store?.setLoadingProgress(0, rqtype)

  const usersMap = new Map<string, UserNode>()
  const NUM_PARALLEL_WORKERS = 2
  const MAX_TOTAL_STREAMS = 10
  const MAX_CONSECUTIVE_ZERO_STREAMS = 2
  let totalStreamsLaunched = 0
  let consecutiveZeroNewStreams = 0

  const runSingleStream = async (): Promise<number> => {
    const rankToken = `${userId}_${generateUUID()}`
    let maxId: string | null = null
    let hasMore = true
    let newUsersInThisStream = 0

    totalStreamsLaunched++

    while (hasMore) {
      if (targetCount != null && targetCount > 0 && usersMap.size >= targetCount) {
        break
      }

      const apiEndpoint = buildEndpoint(userId, maxId, rankToken)
      let response: Response

      try {
        response = await IGFetch(apiEndpoint, appId, csrfToken, wwwClaim)
      } catch (error) {
        logger?.error(`Failed to fetch ${rqtype} via REST stream:`, error)
        break
      }

      if (!response.ok) {
        logger?.warn(`REST API HTTP status ${response.status} for ${rqtype}`)
        break
      }

      const data: InstagramV1FollowResponse = await response.json()

      if (!data || !Array.isArray(data.users)) {
        break
      }

      for (const u of data.users) {
        const idStr = String(u.pk || u.pk_id || "")
        if (idStr && !usersMap.has(idStr)) {
          usersMap.set(idStr, {
            id: idStr,
            username: u.username || "",
            full_name: u.full_name || "",
            profile_pic_url: u.profile_pic_url || "",
            is_private: Boolean(u.is_private),
            is_verified: Boolean(u.is_verified),
            followed_by_viewer: false,
            requested_by_viewer: false,
          })
          newUsersInThisStream++
        }
      }

      store?.setLoadingProgress(usersMap.size, rqtype)

      if (targetCount != null && targetCount > 0 && usersMap.size >= targetCount) {
        break
      }

      const nextMaxId = data.next_max_id != null ? String(data.next_max_id) : null
      if (nextMaxId && nextMaxId !== maxId) {
        maxId = nextMaxId
        hasMore = true
      } else {
        hasMore = false
      }
    }

    return newUsersInThisStream
  }

  const workerLoop = async () => {
    while (
      totalStreamsLaunched < MAX_TOTAL_STREAMS &&
      consecutiveZeroNewStreams < MAX_CONSECUTIVE_ZERO_STREAMS &&
      (targetCount == null || targetCount <= 0 || usersMap.size < targetCount)
    ) {
      const added = await runSingleStream()
      if (added === 0) {
        consecutiveZeroNewStreams++
      } else {
        consecutiveZeroNewStreams = 0
      }

      if (targetCount == null || targetCount <= 0) {
        break
      }
    }
  }

  const workers: Promise<void>[] = []
  for (let i = 0; i < NUM_PARALLEL_WORKERS; i++) {
    workers.push(workerLoop())
    if (targetCount == null || targetCount <= 0) {
      break
    }
  }

  await Promise.all(workers)

  logger?.info(
    `Parallel REST streams complete for ${rqtype}. Total collected: ${usersMap.size} (Target: ${targetCount ?? "N/A"})`,
  )
  return Array.from(usersMap.values())
}

async function retrieveUserFollowers(
  username: string,
  logger?: Logger,
  store?: ReturnType<typeof useUIStore>,
) {
  return retrieveUserFollowersAndFollowing(username, logger, store, {
    followersOnly: true,
  })
}

async function retrieveUserFollowing(
  username: string,
  logger?: Logger,
  store?: ReturnType<typeof useUIStore>,
) {
  return retrieveUserFollowersAndFollowing(username, logger, store, {
    followingOnly: true,
  })
}

async function retrieveUserFollowersAndFollowing(
  username: string,
  logger?: Logger,
  store?: ReturnType<typeof useUIStore>,
  options?: { followersOnly?: boolean, followingOnly?: boolean },
) {
  const appId = findAppId()
  const NotificationDuration = 5000
  if (!appId) {
    logger?.error("Failed to retrieve Instagram App ID.")
    store?.showNotification(
      "Failed to retrieve Instagram App ID. Please make sure you are on a valid profile page.",
      "error",
      NotificationDuration,
    )
    return false
  }
  logger?.info("Instagram App ID:", appId)

  const csrfToken = exportCSRFToken()
  if (!csrfToken) {
    logger?.error("Failed to retrieve CSRF Token.")
    store?.showNotification(
      "Failed to retrieve Instagram CSRF Token. Please make sure you are on a valid profile page.",
      "error",
      NotificationDuration,
    )
    return false
  }
  logger?.info("CSRF Token:", csrfToken)

  const userId = await findUserId(username)

  const wwwClaim = sessionStorage.getItem("www-claim-v2") || ""

  if (!userId) {
    logger?.error("Failed to retrieve Instagram User ID.")
    store?.showNotification(
      "Failed to retrieve Instagram User ID. Please make sure you are on a valid profile page.",
      "error",
      NotificationDuration,
    )
    return false
  }

  browser.runtime.sendMessage({
    type: ActionType.SEND_APP_DATA,
    payload: {
      appId,
      csrfToken,
      wwwClaim,
    },
  } satisfies ExtensionMessage)

  logger?.info("Instagram User ID:", userId)

  const userCounts = await fetchUserCounts(username, userId, appId, csrfToken, wwwClaim)
  logger?.info("Target user counts:", userCounts)

  const fetchBoth = !options?.followersOnly && !options?.followingOnly

  let followers: UserNode[] = []
  if (fetchBoth || options?.followersOnly) {
    logger?.info("Fetching followers...")
    const result = await fetchUsers(
      userId,
      "followers",
      appId,
      csrfToken,
      wwwClaim,
      userCounts.followersCount,
      logger,
      store!,
    )
    if (result === false) {
      return false
    }
    followers = result
  }

  let following: UserNode[] = []
  if (fetchBoth || options?.followingOnly) {
    logger?.info("Fetching following...")
    const result = await fetchUsers(
      userId,
      "following",
      appId,
      csrfToken,
      wwwClaim,
      userCounts.followingCount,
      logger,
      store!,
    )
    if (result === false) {
      return false
    }
    following = result
  }

  try {
    await browser.runtime.sendMessage({
      type: ActionType.BULK_UPSERT_USER_METADATA,
      payload: [...followers, ...following],
    } satisfies ExtensionMessage)
    const timestamp = Date.now()
    const followerIds = followers.map((u) => u.id)
    const followingIds = following.map((u) => u.id)

    await browser.runtime.sendMessage({
      type: ActionType.SAVE_SNAPSHOT,
      payload: {
        userId,
        timestamp,
        followerIds,
        followingIds,
      },
    } satisfies ExtensionMessage)

    logger?.info("Successfully saved snapshot")
  } catch (error) {
    logger?.error("Failed to save snapshot:", error)
    return false
  }

  browser.runtime.sendMessage({
    type: ActionType.NOTIFY_SNAPSHOT_COMPLETE,
    payload: userId,
  } satisfies ExtensionMessage)

  store?.setLoading(false)
  store?.showNotification(
    `Snapshot saved for user @${username} (${followers.length} followers, ${following.length} following).`,
    "success",
    NotificationDuration,
  )

  return true
}

let profileObserver: MutationObserver | null = null

async function saveUserInfo(username: string, logger: Logger = new Logger("InstaSnap:Instagram")) {
  const userId = await findUserId(username)

  if (!userId) {
    logger.error("Failed to retrieve Instagram User ID.")
    return
  }
  logger.info("Saving user info with UID =", userId)

  profileObserver = new MutationObserver((_, observer) => {
    const imgElem: HTMLImageElement | null =
      document.querySelector("header img[crossorigin='anonymous'][draggable='false']") ||
      document.querySelector("header img")
    const usernameElem = document.querySelector("header h2") || document.querySelector("header h1")
    if (usernameElem?.textContent?.trim() !== username) {
      logger.warn(`Username element found but text does not match (${usernameElem?.textContent?.trim()}). Retrying...`)
      return
    }
    const fullnameElem = usernameElem
      ? usernameElem
        .closest("div")
        ?.parentElement?.closest("div")
        ?.nextElementSibling?.querySelector("span")
      : null
    const fullname = fullnameElem?.textContent || "Failed to retrieve"
    const avatarURL = imgElem?.src

    if (fullname && avatarURL) {
      observer.disconnect()
      profileObserver = null

      const userData = {
        id: userId,
        username,
        avatarURL,
        fullName: fullname,
        updatedAt: Date.now(),
      }

      logger.info("Captured metadata via Observer:", userData)

      browser.runtime.sendMessage({
        type: ActionType.SAVE_USER_METADATA,
        payload: userData,
      } satisfies ExtensionMessage)

      logger.info("User metadata saved to IndexedDB")
    }
  })

  profileObserver.observe(document.body, {
    childList: true,
    subtree: true,
  })

  setTimeout(() => {
    if (profileObserver) {
      profileObserver.disconnect()
      profileObserver = null
      logger.warn("Observer timeout - metadata collection stopped.")
    }
    // eslint-disable-next-line no-magic-numbers
  }, 10000)
}

function sendAppDataToBg() {
  const appId = findAppId()
  const csrfToken = exportCSRFToken()
  const wwwClaim = sessionStorage.getItem("www-claim-v2") || ""
  if (!appId || !csrfToken || !wwwClaim) {
    return
  }

  browser.runtime.sendMessage({
    type: ActionType.SEND_APP_DATA,
    payload: {
      appId,
      csrfToken,
      wwwClaim,
    },
  } satisfies ExtensionMessage)
}

export {
  buildFollowersEndpoint,
  buildFollowingEndpoint,
  buildHeaders,
  exportCSRFToken,
  fetchUserCounts,
  fetchUsers,
  findAppId,
  findUserId,
  IGFetch,
  retrieveUserFollowers,
  retrieveUserFollowersAndFollowing,
  retrieveUserFollowing,
  saveUserInfo,
  sendAppDataToBg,
}
