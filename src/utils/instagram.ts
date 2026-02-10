import { ActionType, ExtensionMessage } from "../constants/actions";
import { useUIStore } from "../stores/ui.store";
import {
  Edge,
  InstagramAPIHeader,
  InstagramRequestType,
  UserNode,
} from "../types/instapi";
import { createLogger, Logger } from "./logger";

const IGGraphQLBase = "https://www.instagram.com/graphql/query";
const MAX_USERS_PER_REQUEST = 50;
const FOLLOWERS_QUERY_HASH = "c76146de99bb02f6415203be841dd25a";
const FOLLOWING_QUERY_HASH = "d04b0a864b4b54837c0d870b0e77e076";
const logger = createLogger("InstaSnap:Instagram");

function buildFollowersEndpoint(uid: string, after?: string | null): string {
  const variables = {
    id: uid,
    include_reel: true,
    fetch_mutual: true,
    first: MAX_USERS_PER_REQUEST,
    after: after,
  };
  return `${IGGraphQLBase}/?query_hash=${FOLLOWERS_QUERY_HASH}&variables=${encodeURIComponent(JSON.stringify(variables))}`;
}

function buildFollowingEndpoint(uid: string, after?: string | null): string {
  const variables = {
    id: uid,
    include_reel: true,
    fetch_mutual: true,
    first: MAX_USERS_PER_REQUEST,
    after: after,
  };
  return `${IGGraphQLBase}/?query_hash=${FOLLOWING_QUERY_HASH}&variables=${encodeURIComponent(JSON.stringify(variables))}`;
}

function findAppId(): string {
  const bodyContent = document.querySelector("body")?.innerHTML;
  const appIdMatch = bodyContent?.match(/"APP_ID":"(\d+)"/);
  return appIdMatch ? appIdMatch[1] : "";
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
    );
    if (!response.ok) {
      return null;
    }
    const text = await response.text();
    const userId = text?.match(/"profile_id":"(\d+)"/);
    return userId ? userId[1] : "";
  } catch (error) {
    logger.error("Failed to find user ID:", error);
    return null;
  }
}

function exportCSRFToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : "";
}

/**
 * Build headers for Instagram API requests.
 * @param appId Instagram App ID
 * @return InstagramAPIHeader Headers object
 * */
function buildHeaders(
  appId: string,
  csrfToken: string,
  wwwClaim: string,
): InstagramAPIHeader {
  const headers: InstagramAPIHeader = {} as InstagramAPIHeader;

  // Fixed values
  headers["accept"] = "*/*";
  headers["accept-language"] = "vi,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,ru;q=0.6";
  headers["sec-fetch-dest"] = "empty";
  headers["sec-fetch-mode"] = "cors";
  headers["sec-fetch-site"] = "same-origin";

  // Dynamic values
  headers["x-ig-www-claim"] = wwwClaim;
  headers["x-ig-app-id"] = appId;
  headers["x-csrftoken"] = csrfToken;
  return headers;
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
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

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
  );
}

interface FetchOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  fetchOptions: FetchOptions = {},
): Promise<Response> {
  const { maxRetries = 3, retryDelay = 1000, timeout = 10000 } = fetchOptions;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        // Exponential backoff with jitter
        const baseDelay = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay;
        const exponentialDelay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 1000;
        const delay = Math.min(exponentialDelay + jitter, 60000); // Max 60s

        if (attempt < maxRetries - 1) {
          logger.info(`Rate limited, retrying after ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      if (!response.ok && response.status >= 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }

      await new Promise((resolve) =>
        setTimeout(resolve, retryDelay * Math.pow(2, attempt)),
      );
    }
  }

  throw new Error("Max retries exceeded");
}

async function fetchUsers(
  userId: string,
  rqtype: "followers" | "following",
  appId: string,
  csrfToken: string,
  wwwClaim: string,
  logger?: Logger,
  store?: ReturnType<typeof useUIStore>,
): Promise<UserNode[] | false> {
  const buildEndpoint =
    rqtype === "followers" ? buildFollowersEndpoint : buildFollowingEndpoint;
  const edgeKey = rqtype === "followers" ? "edge_followed_by" : "edge_follow";

  logger?.info(`Fetching ${rqtype} using GraphQL API...`);

  const users: UserNode[] = [];
  let after: string | null = null;
  let hasMore = true;

  store?.setLoading(true);
  store?.setLoadingProgress(0, rqtype);
  while (hasMore) {
    const apiEndpoint = buildEndpoint(userId, after);

    let response;

    try {
      response = await IGFetch(apiEndpoint, appId, csrfToken, wwwClaim);
    } catch (error) {
      logger?.error(`Failed to fetch ${rqtype}:`, error);
      store?.setLoading(false);
      return false;
    }

    const data: InstagramRequestType<typeof rqtype> = await response.json();

    if (!data.data || !data.data.user || !(edgeKey in data.data.user)) {
      logger?.error(`Invalid GraphQL response structure for ${rqtype}`);
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const edgeData = (data.data.user as any)[edgeKey];
    const edges = edgeData.edges || [];

    const batchUsers: UserNode[] = edges.map((edge: Edge) => ({
      id: edge.node.id || "",
      username: edge.node.username || "",
      full_name: edge.node.full_name || "",
      profile_pic_url: edge.node.profile_pic_url || "",
    }));

    users.push(...batchUsers);

    hasMore = edgeData.page_info?.has_next_page || false;
    after = edgeData.page_info?.end_cursor || null;

    store?.setLoadingProgress(users.length, rqtype);
    logger?.info(
      `Fetched ${batchUsers.length} ${rqtype}, total so far: ${users.length}`,
    );
  }

  return users;
}

async function retrieveUserFollowers(
  username: string,
  logger?: Logger,
  store?: ReturnType<typeof useUIStore>,
) {
  return retrieveUserFollowersAndFollowing(username, logger, store, {
    followersOnly: true,
  });
}

async function retrieveUserFollowing(
  username: string,
  logger?: Logger,
  store?: ReturnType<typeof useUIStore>,
) {
  return retrieveUserFollowersAndFollowing(username, logger, store, {
    followingOnly: true,
  });
}

async function retrieveUserFollowersAndFollowing(
  username: string,
  logger?: Logger,
  store?: ReturnType<typeof useUIStore>,
  options?: { followersOnly?: boolean; followingOnly?: boolean },
) {
  const appId = findAppId();
  if (!appId) {
    logger?.error("Failed to retrieve Instagram App ID.");
    store?.showNotification(
      "Failed to retrieve Instagram App ID. Please make sure you are on a valid profile page.",
      "error",
      5000,
    );
    return false;
  }
  logger?.info("Instagram App ID:", appId);

  const csrfToken = exportCSRFToken();
  if (!csrfToken) {
    logger?.error("Failed to retrieve CSRF Token.");
    store?.showNotification(
      "Failed to retrieve Instagram CSRF Token. Please make sure you are on a valid profile page.",
      "error",
      5000,
    );
    return false;
  }
  logger?.info("CSRF Token:", csrfToken);

  const userId = await findUserId(username);

  const wwwClaim = sessionStorage.getItem("www-claim-v2") || "";

  if (!userId) {
    logger?.error("Failed to retrieve Instagram User ID.");
    store?.showNotification(
      "Failed to retrieve Instagram User ID. Please make sure you are on a valid profile page.",
      "error",
      5000,
    );
    return false;
  }

  chrome.runtime.sendMessage({
    type: ActionType.SEND_APP_DATA,
    payload: {
      appId,
      csrfToken,
      wwwClaim,
    },
  } satisfies ExtensionMessage);

  logger?.info("Instagram User ID:", userId);

  const fetchBoth = !options?.followersOnly && !options?.followingOnly;

  let followers: UserNode[] = [];
  if (fetchBoth || options?.followersOnly) {
    logger?.info("Fetching followers...");
    const result = await fetchUsers(
      userId,
      "followers",
      appId,
      csrfToken,
      wwwClaim,
      logger,
      store!,
    );
    if (result === false) {
      return false;
    }
    followers = result;
  }

  let following: UserNode[] = [];
  if (fetchBoth || options?.followingOnly) {
    logger?.info("Fetching following...");
    const result = await fetchUsers(
      userId,
      "following",
      appId,
      csrfToken,
      wwwClaim,
      logger,
      store!,
    );
    if (result === false) {
      return false;
    }
    following = result;
  }

  try {
    await chrome.runtime.sendMessage({
      type: ActionType.BULK_UPSERT_USER_METADATA,
      payload: [...followers, ...following],
    } satisfies ExtensionMessage);
    const timestamp = Date.now();
    const followerIds = followers.map((u) => u.id);
    const followingIds = following.map((u) => u.id);
    
    await chrome.runtime.sendMessage({
      type: ActionType.SAVE_SNAPSHOT,
      payload: {
        userId,
        timestamp,
        followerIds,
        followingIds,
      },
    } satisfies ExtensionMessage);

    logger?.info("Successfully saved snapshot");
  } catch (error) {
    logger?.error("Failed to save snapshot:", error);
    return false;
  }

  chrome.runtime.sendMessage({
    type: ActionType.NOTIFY_SNAPSHOT_COMPLETE,
    payload: userId,
  } satisfies ExtensionMessage);

  store?.setLoading(false);
  store?.showNotification(
    `Snapshot saved for user @${username} (${followers.length} followers, ${following.length} following).`,
    "success",
    3000,
  );

  return true;
}

async function saveUserInfo(
  username: string,
  logger: Logger = new Logger("InstaSnap:Instagram"),
) {
  const userId = await findUserId(username);

  if (!userId) {
    logger.error("Failed to retrieve Instagram User ID.");
    return;
  }
  let retry = 0;
  logger.info("Saving user info with UID =", userId);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  let username_xpath = document.evaluate(
    `//*[text()='${username}']`,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  );
  while (retry < 5 && username_xpath.singleNodeValue === null) {
    logger.info("Retrying to get full name element, attempt", retry + 1);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    username_xpath = document.evaluate(
      `//*[text()='${username}']`,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    );
    retry++;
  }

  if (!username_xpath.singleNodeValue) {
    logger.error("Failed to retrieve username element.");
    return;
  }

  const usernameEl = username_xpath.singleNodeValue as HTMLElement;
  const firstDiv = usernameEl.closest("div");
  const secondDiv = firstDiv?.parentElement?.closest("div");
  const fullname_elem = secondDiv?.nextElementSibling?.querySelector("span");

  let img_elem: HTMLImageElement | null = null;
  const img_elems = document.querySelectorAll(
    "img.xpdipgo.x972fbf.x10w94by.x1qhh985",
  ) as NodeListOf<HTMLImageElement>;

  if (img_elems.length <= 1) {
    logger.error(
      "Failed to retrieve profile picture URL using first method, trying alternative.",
    );
    img_elem = document.querySelector(
      "img.xz74otr.x15mokao.x1ga7v0g.x16uus16.xbiv7yw.x972fbf.x10w94by",
    ) as HTMLImageElement;

    if (!img_elem) {
      logger.error("Failed to retrieve profile picture element.");
      return;
    }
  }

  let fullname = "Failed to retrieve";
  if (!fullname_elem) {
    logger.error("Failed to retrieve full name element.");
  } else {
    fullname = fullname_elem.textContent;
  }

  const profile_pic_url = img_elem ? img_elem.src : img_elems[1].src;
  const userData = {
    id: userId,
    username,
    avatarURL: profile_pic_url,
    fullName: fullname,
    updatedAt: Date.now(),
  };

  logger.info("Retrieved user data:", userData);
  await chrome.runtime.sendMessage({
    type: ActionType.SAVE_USER_METADATA,
    payload: userData,
  } satisfies ExtensionMessage);
  logger.info("Saved user info to IndexedDB:", userData);
}

function sendAppDataToBg() {
  const appId = findAppId();
  const csrfToken = exportCSRFToken();
  const wwwClaim = sessionStorage.getItem("www-claim-v2") || "";
  if (!appId || !csrfToken || !wwwClaim) {
    return;
  }

  chrome.runtime.sendMessage({
    type: ActionType.SEND_APP_DATA,
    payload: {
      appId,
      csrfToken,
      wwwClaim,
    },
  } satisfies ExtensionMessage);
}

export {
  buildFollowersEndpoint,
  buildFollowingEndpoint,
  buildHeaders,
  exportCSRFToken,
  fetchUsers,
  findAppId,
  findUserId,
  IGFetch,
  retrieveUserFollowers,
  retrieveUserFollowersAndFollowing,
  retrieveUserFollowing,
  saveUserInfo,
  sendAppDataToBg
};

