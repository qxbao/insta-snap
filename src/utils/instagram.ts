import {
  InstagramAPIHeader,
  InstagramFollowersResponse,
  User,
} from "../types/instapi";
import { Logger } from "./logger";
import { saveFollowersSnapshot, saveFollowingSnapshot, saveCompleteSnapshot } from "./storage";

const IGGraphQLBase = "https://www.instagram.com/graphql/query";
const MAX_USERS_PER_REQUEST = 50;
const FOLLOWERS_QUERY_HASH = "c76146de99bb02f6415203be841dd25a";
const FOLLOWING_QUERY_HASH = "d04b0a864b4b54837c0d870b0e77e076";

function buildFollowersEndpoint(
  uid: string,
  after?: string | null,
): string {
  const variables = {
    id: uid,
    include_reel: true,
    fetch_mutual: true,
    first: MAX_USERS_PER_REQUEST,
    after: after,
  };
  return `${IGGraphQLBase}/?query_hash=${FOLLOWERS_QUERY_HASH}&variables=${encodeURIComponent(JSON.stringify(variables))}`;
}

function buildFollowingEndpoint(
  uid: string,
  after?: string | null,
): string {
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
  const userId = bodyContent?.match(/"user_id":"(\d+)"/);
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
): Promise<User[] | false> {
  const buildEndpoint = type === "followers" ? buildFollowersEndpoint : buildFollowingEndpoint;
  const edgeKey = type === "followers" ? "edge_followed_by" : "edge_follow";
  
  logger.info(`Fetching ${type} using GraphQL API...`);

  const users: User[] = [];
  let after: string | null = null;
  let hasMore = true;

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
    
    logger.info(
      `Fetched ${batchUsers.length} ${type}, total so far: ${users.length}`,
    );
  }

  logger.info(`Total ${type} retrieved: ${users.length}`);
  return users;
}

async function retrieveUserFollowers(logger: Logger) {
  return retrieveUserFollowersAndFollowing(logger, { followersOnly: true });
}

async function retrieveUserFollowing(logger: Logger) {
  return retrieveUserFollowersAndFollowing(logger, { followingOnly: true });
}

async function retrieveUserFollowersAndFollowing(
  logger: Logger,
  options?: { followersOnly?: boolean; followingOnly?: boolean },
) {
  const appId = findAppId();
  if (!appId) {
    logger.error("Failed to retrieve Instagram App ID.");
    return false;
  }
  logger.info("Instagram App ID:", appId);

  const csrfToken = exportCSRFToken();
  if (!csrfToken) {
    logger.error("Failed to retrieve CSRF Token.");
    return false;
  }
  logger.info("CSRF Token:", csrfToken);

  const userId = findUserId();
  if (!userId) {
    logger.error("Failed to retrieve Instagram User ID.");
    return false;
  }
  logger.info("Instagram User ID:", userId);

  const fetchBoth = !options?.followersOnly && !options?.followingOnly;

  let followers: User[] = [];
  if (fetchBoth || options?.followersOnly) {
    logger.info("Fetching followers...");
    const result = await fetchUsers(userId, "followers", appId, csrfToken, logger);
    if (result === false) {
      return false;
    }
    followers = result;
  }

  let following: User[] = [];
  if (fetchBoth || options?.followingOnly) {
    logger.info("Fetching following...");
    const result = await fetchUsers(userId, "following", appId, csrfToken, logger);
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

  return true;
}

export {
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
