import { ExtensionMessageResponse, Status } from "../constants/status";
import { useUIStore } from "../stores/ui.store";
import {
  InstagramAPIHeader,
  InstagramFollowersResponse,
  User,
} from "../types/instapi";
import { Logger } from "./logger";
import {
  saveFollowersSnapshot,
  saveFollowingSnapshot,
  saveCompleteSnapshot,
  getGlobalUserMap,
} from "./storage";

const IGGraphQLBase = "https://www.instagram.com/graphql/query";
const MAX_USERS_PER_REQUEST = 50;
const FOLLOWERS_QUERY_HASH = "c76146de99bb02f6415203be841dd25a";
const FOLLOWING_QUERY_HASH = "d04b0a864b4b54837c0d870b0e77e076";

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

function findUserId(): string {
  const bodyContent = document.querySelector("body")?.innerHTML;
  const userId = bodyContent?.match(/"profile_id":"(\d+)"/);
  return userId ? userId[1] : "";
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
function buildHeaders(appId: string, csrfToken: string): InstagramAPIHeader {
  const headers: InstagramAPIHeader = {} as InstagramAPIHeader;

  // Fixed values
  headers["accept"] = "*/*";
  headers["accept-language"] = "vi,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,ru;q=0.6";
  headers["sec-fetch-dest"] = "empty";
  headers["sec-fetch-mode"] = "cors";
  headers["sec-fetch-site"] = "same-origin";
  // Dynamic values
  const wwwClaim = sessionStorage.getItem("www-claim-v2") || "";
  headers["x-ig-www-claim"] = wwwClaim;
  headers["x-ig-app-id"] = appId;
  headers["x-csrftoken"] = csrfToken;
  return headers;
}

/**
 * Custom fetch function for Instagram API requests.
 * @param input URL or RequestInfo
 * @param appId Instagram App ID
 * @param init Optional RequestInit object
 * @returns Promise<Response> Fetch response
 */
function IGFetch(
  input: URL | RequestInfo,
  appId: string = findAppId(),
  csrfToken: string = exportCSRFToken(),
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, {
    headers: {
      ...buildHeaders(appId, csrfToken),
    },
    credentials: "include",
    mode: "cors",
    ...init,
  });
}

async function fetchUsers(
  userId: string,
  type: "followers" | "following",
  appId: string,
  csrfToken: string,
  logger: Logger,
  store: ReturnType<typeof useUIStore>,
): Promise<User[] | false> {
  const buildEndpoint =
    type === "followers" ? buildFollowersEndpoint : buildFollowingEndpoint;
  const edgeKey = type === "followers" ? "edge_followed_by" : "edge_follow";

  logger.info(`Fetching ${type} using GraphQL API...`);

  const users: User[] = [];
  let after: string | null = null;
  let hasMore = true;
  store.setLoading(true);
  store.setLoadingProgress(0, type);
  while (hasMore) {
    const apiEndpoint = buildEndpoint(userId, after);

    const response = await IGFetch(apiEndpoint, appId, csrfToken);
    if (!response.ok) {
      logger.error(
        `Failed to fetch ${type}: ${response.status} ${response.statusText}`,
      );
      return false;
    }

    const data = await response.json();

    if (!data.data || !data.data.user || !data.data.user[edgeKey]) {
      logger.error(`Invalid GraphQL response structure for ${type}`);
      return false;
    }

    const edgeData = data.data.user[edgeKey];
    const edges = edgeData.edges || [];

    const batchUsers: User[] = edges.map((edge: any) => ({
      pk: edge.node.id || edge.node.pk || "",
      username: edge.node.username || "",
      full_name: edge.node.full_name || "",
      profile_pic_url: edge.node.profile_pic_url || "",
    }));

    users.push(...batchUsers);

    hasMore = edgeData.page_info?.has_next_page || false;
    after = edgeData.page_info?.end_cursor || null;

    store.setLoadingProgress(users.length, type);
    logger.info(
      `Fetched ${batchUsers.length} ${type}, total so far: ${users.length}`,
    );
  }

  return users;
}

async function retrieveUserFollowers(
  logger: Logger,
  store: ReturnType<typeof useUIStore> | void,
) {
  return retrieveUserFollowersAndFollowing(logger, store, {
    followersOnly: true,
  });
}

async function retrieveUserFollowing(
  logger: Logger,
  store: ReturnType<typeof useUIStore> | void,
) {
  return retrieveUserFollowersAndFollowing(logger, store, {
    followingOnly: true,
  });
}

async function retrieveUserFollowersAndFollowing(
  logger: Logger,
  store: ReturnType<typeof useUIStore> | void,
  options?: { followersOnly?: boolean; followingOnly?: boolean },
) {
  const appId = findAppId();
  if (!appId) {
    logger.error("Failed to retrieve Instagram App ID.");
    store!.showNotification(
      "Failed to retrieve Instagram App ID. Please make sure you are on a valid profile page.",
      "error",
      5000,
    );
    return false;
  }
  logger.info("Instagram App ID:", appId);

  const csrfToken = exportCSRFToken();
  if (!csrfToken) {
    logger.error("Failed to retrieve CSRF Token.");
    store!.showNotification(
      "Failed to retrieve Instagram CSRF Token. Please make sure you are on a valid profile page.",
      "error",
      5000,
    );
    return false;
  }
  logger.info("CSRF Token:", csrfToken);

  const userId = findUserId();
  if (!userId) {
    logger.error("Failed to retrieve Instagram User ID.");
    store!.showNotification(
      "Failed to retrieve Instagram User ID. Please make sure you are on a valid profile page.",
      "error",
      5000,
    );
    return false;
  }
  logger.info("Instagram User ID:", userId);

  const fetchBoth = !options?.followersOnly && !options?.followingOnly;

  let followers: User[] = [];
  if (fetchBoth || options?.followersOnly) {
    logger.info("Fetching followers...");
    const result = await fetchUsers(
      userId,
      "followers",
      appId,
      csrfToken,
      logger,
      store!,
    );
    if (result === false) {
      return false;
    }
    followers = result;
  }

  let following: User[] = [];
  if (fetchBoth || options?.followingOnly) {
    logger.info("Fetching following...");
    const result = await fetchUsers(
      userId,
      "following",
      appId,
      csrfToken,
      logger,
      store!,
    );
    if (result === false) {
      return false;
    }
    following = result;
  }

  try {
    if (fetchBoth) {
      await saveCompleteSnapshot(userId, followers, following, logger);
      logger.info("Successfully saved complete snapshot");
    } else if (options?.followersOnly) {
      await saveFollowersSnapshot(userId, followers, logger);
      logger.info("Successfully saved followers snapshot");
    } else if (options?.followingOnly) {
      await saveFollowingSnapshot(userId, following, logger);
      logger.info("Successfully saved following snapshot");
    }
  } catch (error) {
    logger.error("Failed to save snapshot:", error);
    return false;
  }

  chrome.runtime.sendMessage({
    type: Status.SnapshotComplete,
    payload: userId,
  });
  
  store!.setLoading(false);
  store!.showNotification(`Snapshot saved for user @${userId}`, "success", 3000);

  return true;
}

async function saveUserInfo(
  logger: Logger = new Logger("InstaSnap:Instagram"),
) {
  const userId = findUserId();
  const globalUserMap = await getGlobalUserMap();
  let retry = 0;
  if (!(userId in globalUserMap) && userId) {
    logger.info("Saving user info with UID =", userId);
    const username = window.location.pathname.split("/").filter(Boolean)[0];
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
    const firstDiv = usernameEl.closest('div');
    const secondDiv = firstDiv?.parentElement?.closest('div');
    const fullname_elem = secondDiv?.nextElementSibling?.querySelector('span');
    
    const img_elem = document.querySelectorAll(
      "img.xpdipgo.x972fbf.x10w94by.x1qhh985",
    ) as NodeListOf<HTMLImageElement>;
    if (img_elem.length <= 1) {
      logger.error("Failed to retrieve profile picture URL.");
      return;
    }

    let fullname = "Failed to retrieve";
    if (!fullname_elem) {
      logger.error("Failed to retrieve full name element.");
    } else {
      fullname = fullname_elem.textContent;
    }

    const profile_pic_url = img_elem[1].src;
    const userData = {
      username,
      profile_pic_url,
      full_name: fullname,
      last_updated: Date.now(),
    };

    logger.info("Retrieved user data:", userData);
    globalUserMap[userId] = userData;

    await chrome.storage.local.set({ users_metadata: globalUserMap });
    logger.info("Saved user info to storage:", globalUserMap[userId]);
  }
}

export {
  saveUserInfo,
  buildFollowersEndpoint,
  buildFollowingEndpoint,
  buildHeaders,
  exportCSRFToken,
  retrieveUserFollowers,
  retrieveUserFollowing,
  retrieveUserFollowersAndFollowing,
  findAppId,
  IGFetch,
  findUserId,
};
