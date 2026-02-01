import {
  GlobalUserMap,
  UserSnapshotMeta,
  SnapshotRecord,
} from "../types/storage";
import { User } from "../types/instapi";
import { Logger } from "./logger";

const CHECKPOINT_INTERVAL = 5;

/**
 * Get GlobalUserMap from Extension local storage
 * @returns GlobalUserMap All users metadata map
*/
export async function getGlobalUserMap(): Promise<GlobalUserMap> {
  const result = await chrome.storage.local.get("users_metadata");
  if (!result.users_metadata) {
    return {} as GlobalUserMap;
  }
  return result.users_metadata as GlobalUserMap;
}

/**
 * Update GlobalUserMap with a list of new users
 * @param users List of users to add/update in the map
 * @returns void
 */
export async function updateGlobalUserMap(users: User[]): Promise<void> {
  const userMap = await getGlobalUserMap();
  const now = Date.now();

  for (const user of users) {
    try {
      userMap[user.pk] = {
        username: user.username || "unknown",
        full_name: user.full_name || user.username || "Unknown User",
        profile_pic_url: user.profile_pic_url || "",
        last_updated: now,
      };
    } catch (error) {
      userMap[user.pk] = {
        username: user.pk || "unknown",
        full_name: user.full_name || user.username || "No name",
        profile_pic_url: "",
        last_updated: now,
      };
    }
  }

  await chrome.storage.local.set({ users_metadata: userMap });
}

export async function getUserSnapshotMeta(
  targetId: string,
): Promise<UserSnapshotMeta | null> {
  const key = `meta_${targetId}`;
  const result = await chrome.storage.local.get(key);
  return (result[key] as UserSnapshotMeta) || null;
}

export async function saveUserSnapshotMeta(
  meta: UserSnapshotMeta,
): Promise<void> {
  const key = `meta_${meta.targetId}`;
  await chrome.storage.local.set({ [key]: meta });
}

/**
 * Get SnapshotRecord at specific timestamp
 */
export async function getSnapshotRecord(
  targetId: string,
  timestamp: number,
): Promise<SnapshotRecord | null> {
  const key = `data_${targetId}_${timestamp}`;
  const result = await chrome.storage.local.get(key);
  return (result[key] as SnapshotRecord) || null;
}

/**
 * Save SnapshotRecord at specific timestamp
 */
export async function saveSnapshotRecord(
  targetId: string,
  timestamp: number,
  record: SnapshotRecord,
): Promise<void> {
  const key = `data_${targetId}_${timestamp}`;
  await chrome.storage.local.set({ [key]: record });
}

/**
 * Calculate difference between two lists of user IDs
 */
export function calculateDiff(
  oldList: string[],
  newList: string[],
): { add: string[]; rem: string[] } {
  const oldSet = new Set(oldList);
  const newSet = new Set(newList);

  const add = newList.filter((id) => !oldSet.has(id));
  const rem = oldList.filter((id) => !newSet.has(id));

  return { add, rem };
}

/**
 * Get full followers list up to a certain timestamp
 */
export async function getFullFollowersList(
  targetId: string,
  upToTimestamp?: number,
  logger?: Logger,
): Promise<string[]> {
  const meta = await getUserSnapshotMeta(targetId);
  if (!meta || meta.logTimeline.length === 0) {
    return [];
  }

  const relevantCheckpoints = upToTimestamp
    ? meta.checkpoints.filter((cp) => cp <= upToTimestamp)
    : meta.checkpoints;

  if (relevantCheckpoints.length === 0) {
    logger?.error("No checkpoint found");
    return [];
  }

  const latestCheckpoint = Math.max(...relevantCheckpoints);
  const checkpointRecord = await getSnapshotRecord(targetId, latestCheckpoint);

  if (!checkpointRecord || !checkpointRecord.isCheckpoint) {
    logger?.error("Checkpoint record not found or invalid");
    return [];
  }

  let followers = new Set(checkpointRecord.followers.add || []);

  const deltasToApply = upToTimestamp
    ? meta.logTimeline.filter(
        (ts) => ts > latestCheckpoint && ts <= upToTimestamp,
      )
    : meta.logTimeline.filter((ts) => ts > latestCheckpoint);

  for (const timestamp of deltasToApply) {
    const record = await getSnapshotRecord(targetId, timestamp);
    if (record && !record.isCheckpoint) {
      if (record.followers.add) {
        record.followers.add.forEach((id) => followers.add(id));
      }
      if (record.followers.rem) {
        record.followers.rem.forEach((id) => followers.delete(id));
      }
    }
  }

  return Array.from(followers);
}

/**
 * Get full following list up to a certain timestamp
 */
export async function getFullFollowingList(
  targetId: string,
  upToTimestamp?: number,
  logger?: Logger,
): Promise<string[]> {
  const meta = await getUserSnapshotMeta(targetId);
  if (!meta || meta.logTimeline.length === 0) {
    return [];
  }

  const relevantCheckpoints = upToTimestamp
    ? meta.checkpoints.filter((cp) => cp <= upToTimestamp)
    : meta.checkpoints;

  if (relevantCheckpoints.length === 0) {
    logger?.error("No checkpoint found");
    return [];
  }

  const latestCheckpoint = Math.max(...relevantCheckpoints);
  const checkpointRecord = await getSnapshotRecord(targetId, latestCheckpoint);

  if (!checkpointRecord || !checkpointRecord.isCheckpoint) {
    logger?.error("Checkpoint record not found or invalid");
    return [];
  }

  let following = new Set(checkpointRecord.following.add || []);
  const deltasToApply = upToTimestamp
    ? meta.logTimeline.filter(
        (ts) => ts > latestCheckpoint && ts <= upToTimestamp,
      )
    : meta.logTimeline.filter((ts) => ts > latestCheckpoint);

  for (const timestamp of deltasToApply) {
    const record = await getSnapshotRecord(targetId, timestamp);
    if (record && !record.isCheckpoint) {
      if (record.following.add) {
        record.following.add.forEach((id) => following.add(id));
      }
      if (record.following.rem) {
        record.following.rem.forEach((id) => following.delete(id));
      }
    }
  }

  return Array.from(following);
}

/**
 *  Take new Snapshot - auto decide checkpoint or delta for followers
 */
export async function saveFollowersSnapshot(
  targetId: string,
  currentFollowers: User[],
  logger?: Logger,
): Promise<void> {
  const timestamp = Date.now();
  const followerIds = currentFollowers.map((u) => u.pk);

  await updateGlobalUserMap(currentFollowers);

  let meta = await getUserSnapshotMeta(targetId);

  if (!meta) {
    logger?.info("Creating first checkpoint");
    meta = {
      targetId,
      checkpoints: [timestamp],
      logTimeline: [timestamp],
    };

    const record: SnapshotRecord = {
      isCheckpoint: true,
      followers: {
        add: followerIds,
      },
      following: {},
    };

    await saveSnapshotRecord(targetId, timestamp, record);
    await saveUserSnapshotMeta(meta);
    logger?.info(`Saved first checkpoint with ${followerIds.length} followers`);
    return;
  }

  const snapshotsSinceLastCheckpoint =
    meta.logTimeline.length - meta.checkpoints.length + 1;
  const shouldCreateCheckpoint = snapshotsSinceLastCheckpoint >= CHECKPOINT_INTERVAL;

  if (shouldCreateCheckpoint) {
    logger?.info(
      `Creating new checkpoint (${snapshotsSinceLastCheckpoint} snapshots since last)`,
    );

    const record: SnapshotRecord = {
      isCheckpoint: true,
      followers: {
        add: followerIds,
      },
      following: {},
    };

    meta.checkpoints.push(timestamp);
    meta.logTimeline.push(timestamp);

    await saveSnapshotRecord(targetId, timestamp, record);
    await saveUserSnapshotMeta(meta);
    logger?.info(`Saved checkpoint with ${followerIds.length} followers`);
  } else {
    logger?.info("Creating delta snapshot");

    const previousFollowers = await getFullFollowersList(targetId, undefined, logger);
    const diff = calculateDiff(previousFollowers, followerIds);

    if (diff.add.length > 0 || diff.rem.length > 0) {
      const record: SnapshotRecord = {
        isCheckpoint: false,
        followers: {
          add: diff.add.length > 0 ? diff.add : undefined,
          rem: diff.rem.length > 0 ? diff.rem : undefined,
        },
        following: {},
      };

      meta.logTimeline.push(timestamp);

      await saveSnapshotRecord(targetId, timestamp, record);
      await saveUserSnapshotMeta(meta);
      logger?.info(
        `Saved delta: +${diff.add.length} followers, -${diff.rem.length} followers`,
      );
    } else {
      logger?.info("No changes detected, skipping snapshot");
    }
  }
}

/**
 * Get followers change history
 */
export async function getFollowersHistory(
  targetId: string,
  logger?: Logger,
): Promise<
  Array<{
    timestamp: number;
    isCheckpoint: boolean;
    addedCount: number;
    removedCount: number;
    totalCount?: number;
  }>
> {
  const meta = await getUserSnapshotMeta(targetId);
  if (!meta) {
    return [];
  }

  const history = [];
  for (const timestamp of meta.logTimeline) {
    const record = await getSnapshotRecord(targetId, timestamp);
    if (record) {
      const entry: any = {
        timestamp,
        isCheckpoint: record.isCheckpoint,
        addedCount: record.followers.add?.length || 0,
        removedCount: record.followers.rem?.length || 0,
      };

      if (record.isCheckpoint) {
        entry.totalCount = record.followers.add?.length || 0;
      }

      history.push(entry);
    }
  }

  return history;
}

/**
 * Take new Snapshot - auto decide checkpoint or delta
 */
export async function saveFollowingSnapshot(
  targetId: string,
  currentFollowing: User[],
  logger?: Logger,
): Promise<void> {
  const timestamp = Date.now();
  const followingIds = currentFollowing.map((u) => u.pk);

  await updateGlobalUserMap(currentFollowing);

  let meta = await getUserSnapshotMeta(targetId);

  if (!meta) {
    logger?.info("Creating first checkpoint for following");
    meta = {
      targetId,
      checkpoints: [timestamp],
      logTimeline: [timestamp],
    };

    const record: SnapshotRecord = {
      isCheckpoint: true,
      followers: {},
      following: {
        add: followingIds,
      },
    };

    await saveSnapshotRecord(targetId, timestamp, record);
    await saveUserSnapshotMeta(meta);
    logger?.info(`Saved first checkpoint with ${followingIds.length} following`);
    return;
  }

  const snapshotsSinceLastCheckpoint =
    meta.logTimeline.length - meta.checkpoints.length + 1;
  const shouldCreateCheckpoint = snapshotsSinceLastCheckpoint >= CHECKPOINT_INTERVAL;

  if (shouldCreateCheckpoint) {
    logger?.info(
      `Creating new checkpoint (${snapshotsSinceLastCheckpoint} snapshots since last)`,
    );

    const record: SnapshotRecord = {
      isCheckpoint: true,
      followers: {},
      following: {
        add: followingIds,
      },
    };

    meta.checkpoints.push(timestamp);
    meta.logTimeline.push(timestamp);

    await saveSnapshotRecord(targetId, timestamp, record);
    await saveUserSnapshotMeta(meta);
    logger?.info(`Saved checkpoint with ${followingIds.length} following`);
  } else {
    logger?.info("Creating delta snapshot for following");

    const previousFollowing = await getFullFollowingList(targetId, undefined, logger);
    const diff = calculateDiff(previousFollowing, followingIds);

    if (diff.add.length > 0 || diff.rem.length > 0) {
      const record: SnapshotRecord = {
        isCheckpoint: false,
        followers: {},
        following: {
          add: diff.add.length > 0 ? diff.add : undefined,
          rem: diff.rem.length > 0 ? diff.rem : undefined,
        },
      };

      meta.logTimeline.push(timestamp);

      await saveSnapshotRecord(targetId, timestamp, record);
      await saveUserSnapshotMeta(meta);
      logger?.info(
        `Saved delta: +${diff.add.length} following, -${diff.rem.length} following`,
      );
    } else {
      logger?.info("No changes detected, skipping snapshot");
    }
  }
}

/**
 * Get user's following change history
 */
export async function getFollowingHistory(
  targetId: string,
  logger?: Logger,
): Promise<
  Array<{
    timestamp: number;
    isCheckpoint: boolean;
    addedCount: number;
    removedCount: number;
    totalCount?: number;
  }>
> {
  const meta = await getUserSnapshotMeta(targetId);
  if (!meta) {
    return [];
  }

  const history = [];
  for (const timestamp of meta.logTimeline) {
    const record = await getSnapshotRecord(targetId, timestamp);
    if (record) {
      const entry: any = {
        timestamp,
        isCheckpoint: record.isCheckpoint,
        addedCount: record.following.add?.length || 0,
        removedCount: record.following.rem?.length || 0,
      };

      if (record.isCheckpoint) {
        entry.totalCount = record.following.add?.length || 0;
      }

      history.push(entry);
    }
  }

  return history;
}

/**
 * Save both followers and following in a single snapshot
 */
export async function saveCompleteSnapshot(
  targetId: string,
  currentFollowers: User[],
  currentFollowing: User[],
  logger?: Logger,
): Promise<void> {
  const timestamp = Date.now();
  const followerIds = currentFollowers.map((u) => u.pk);
  const followingIds = currentFollowing.map((u) => u.pk);

  await updateGlobalUserMap([...currentFollowers, ...currentFollowing]);

  let meta = await getUserSnapshotMeta(targetId);

  if (!meta) {
    logger?.info("Creating first complete checkpoint");
    meta = {
      targetId,
      checkpoints: [timestamp],
      logTimeline: [timestamp],
    };

    const record: SnapshotRecord = {
      isCheckpoint: true,
      followers: {
        add: followerIds,
      },
      following: {
        add: followingIds,
      },
    };

    await saveSnapshotRecord(targetId, timestamp, record);
    await saveUserSnapshotMeta(meta);
    logger?.info(
      `Saved first checkpoint with ${followerIds.length} followers and ${followingIds.length} following`,
    );
    return;
  }

  const snapshotsSinceLastCheckpoint =
    meta.logTimeline.length - meta.checkpoints.length + 1;
  const shouldCreateCheckpoint =
    snapshotsSinceLastCheckpoint >= CHECKPOINT_INTERVAL;

  if (shouldCreateCheckpoint) {
    logger?.info(
      `Creating new checkpoint (${snapshotsSinceLastCheckpoint} snapshots since last)`,
    );

    const record: SnapshotRecord = {
      isCheckpoint: true,
      followers: {
        add: followerIds,
      },
      following: {
        add: followingIds,
      },
    };

    meta.checkpoints.push(timestamp);
    meta.logTimeline.push(timestamp);

    await saveSnapshotRecord(targetId, timestamp, record);
    await saveUserSnapshotMeta(meta);
    logger?.info(
      `Saved checkpoint with ${followerIds.length} followers and ${followingIds.length} following`,
    );
  } else {
    logger?.info("Creating delta snapshot");

    const previousFollowers = await getFullFollowersList(
      targetId,
      undefined,
      logger,
    );
    const previousFollowing = await getFullFollowingList(
      targetId,
      undefined,
      logger,
    );

    const followersDiff = calculateDiff(previousFollowers, followerIds);
    const followingDiff = calculateDiff(previousFollowing, followingIds);

    const hasChanges =
      followersDiff.add.length > 0 ||
      followersDiff.rem.length > 0 ||
      followingDiff.add.length > 0 ||
      followingDiff.rem.length > 0;

    if (hasChanges) {
      const record: SnapshotRecord = {
        isCheckpoint: false,
        followers: {
          add: followersDiff.add.length > 0 ? followersDiff.add : undefined,
          rem: followersDiff.rem.length > 0 ? followersDiff.rem : undefined,
        },
        following: {
          add: followingDiff.add.length > 0 ? followingDiff.add : undefined,
          rem: followingDiff.rem.length > 0 ? followingDiff.rem : undefined,
        },
      };

      meta.logTimeline.push(timestamp);

      await saveSnapshotRecord(targetId, timestamp, record);
      await saveUserSnapshotMeta(meta);
      logger?.info(
        `Saved delta: Followers(+${followersDiff.add.length}/-${followersDiff.rem.length}), Following(+${followingDiff.add.length}/-${followingDiff.rem.length})`,
      );
    } else {
      logger?.info("No changes detected, skipping snapshot");
    }
  }
}

export async function getUserSnapshotCount(
  targetId: string,
): Promise<number> {
  return getUserSnapshotMeta(targetId).then((meta) =>
    meta ? meta.logTimeline.length : -1,
  );
}

export async function getUserLastSnapshotTime(
  targetId: string,
): Promise<number | null> {
  const meta = await getUserSnapshotMeta(targetId);
  if (!meta || meta.logTimeline.length === 0) {
    return null;
  }
  return Math.max(...meta.logTimeline);
}

/**
 * Get a list of all users that have been tracked (have snapshots)
 */
export async function getAllTrackedUsers(): Promise<
  Array<{
    userId: string;
    username: string;
    full_name: string;
    profile_pic_url: string;
    snapshotCount: number;
    lastSnapshot: number | null;
    last_updated: number;
  }>
> {
  const trackedUsers: Array<{
    userId: string;
    username: string;
    full_name: string;
    profile_pic_url: string;
    snapshotCount: number;
    lastSnapshot: number | null;
    last_updated: number;
  }> = [];

  const allKeys = await chrome.storage.local.getKeys();
  const metaKeys = allKeys.filter(key => key.startsWith("meta_"));
  const metas = await chrome.storage.local.get(metaKeys);

  for (const metaKey of metaKeys) {
    const userId = metaKey.replace("meta_", "");
    const meta = metas[metaKey] as UserSnapshotMeta;
    const globalUserMap = await getGlobalUserMap();
    const userInfo = globalUserMap[userId];

    if (userInfo && meta) {
      trackedUsers.push({
        userId,
        username: userInfo.username,
        full_name: userInfo.full_name,
        profile_pic_url: userInfo.profile_pic_url,
        snapshotCount: meta.logTimeline.length,
        lastSnapshot: meta.logTimeline.length > 0 ? Math.max(...meta.logTimeline) : null,
        last_updated: userInfo.last_updated,
      });
    }
  }

  trackedUsers.sort((a, b) => {
    if (!a.lastSnapshot) return 1;
    if (!b.lastSnapshot) return -1;
    return b.lastSnapshot - a.lastSnapshot;
  });

  return trackedUsers;
}