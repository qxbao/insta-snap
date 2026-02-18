import { createLogger } from "./logger";
import { database } from "./database";
import { GlobalUserMap, UserSnapshotMeta, SnapshotRecord } from "../types/z_deprecated_storage";

const logger = createLogger("Migration");

interface MigrationStats {
  usersMetadata: number;
  snapshots: number;
  crons: number;
  errors: string[];
}

/**
 * Migrate all data from chrome.storage.local to IndexedDB
 * This should be run once after upgrading to IndexedDB version
 */
export async function migrateFromChromeStorage(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    usersMetadata: 0,
    snapshots: 0,
    crons: 0,
    errors: [],
  };

  logger.info("Starting migration from chrome.storage to IndexedDB...");

  try {
    // 1. Migrate user metadata
    await migrateUserMetadata(stats);

    // 2. Migrate snapshots
    await migrateSnapshots(stats);

    // 3. Migrate crons
    await migrateCrons(stats);

    logger.info("Migration completed successfully!", stats);
    return stats;
  } catch (error) {
    logger.error("Migration failed:", error);
    stats.errors.push(`Fatal error: ${error}`);
    throw error;
  }
}

/**
 * Migrate users_metadata from chrome.storage to IndexedDB
 */
async function migrateUserMetadata(stats: MigrationStats): Promise<void> {
  logger.info("Migrating user metadata...");

  try {
    const result = await chrome.storage.local.get("users_metadata");
    const userMap = result.users_metadata as GlobalUserMap | undefined;

    if (!userMap) {
      logger.info("No users_metadata found in chrome.storage");
      return;
    }

    const users = Object.entries(userMap).map(([id, user]) => ({
      id,
      username: user.username,
      fullName: user.full_name,
      avatarURL: user.profile_pic_url,
      updatedAt: user.last_updated,
    }));

    await database.userMetadata.bulkPut(users);
    stats.usersMetadata = users.length;
    logger.info(`Migrated ${users.length} user metadata records`);
  } catch (error) {
    logger.error("Failed to migrate user metadata:", error);
    stats.errors.push(`User metadata: ${error}`);
  }
}

/**
 * Migrate all snapshots from chrome.storage to IndexedDB
 */
async function migrateSnapshots(stats: MigrationStats): Promise<void> {
  logger.info("Migrating snapshots...");

  try {
    const allKeys = await chrome.storage.local.getKeys();
    const metaKeys = allKeys.filter((key) => key.startsWith("meta_"));

    logger.info(`Found ${metaKeys.length} users to migrate`);

    for (const metaKey of metaKeys) {
      const userId = metaKey.replace("meta_", "");

      try {
        await migrateUserSnapshots(userId, stats);
      } catch (error) {
        logger.error(`Failed to migrate snapshots for user ${userId}:`, error);
        stats.errors.push(`User ${userId}: ${error}`);
      }
    }

    logger.info(`Total snapshots migrated: ${stats.snapshots}`);
  } catch (error) {
    logger.error("Failed to migrate snapshots:", error);
    stats.errors.push(`Snapshots: ${error}`);
  }
}

/**
 * Migrate snapshots for a specific user
 */
async function migrateUserSnapshots(userId: string, stats: MigrationStats): Promise<void> {
  // Get user metadata
  const metaKey = `meta_${userId}`;
  const metaResult = await chrome.storage.local.get(metaKey);
  const meta = metaResult[metaKey] as UserSnapshotMeta | undefined;

  if (!meta) {
    logger.info(`No metadata found for user ${userId}`);
    return;
  }

  logger.info(`Migrating ${meta.logTimeline.length} snapshots for user ${userId}`);

  // Get all snapshot records for this user
  const snapshotKeys = meta.logTimeline.map((timestamp) => `data_${userId}_${timestamp}`);
  const snapshotsResult = await chrome.storage.local.get(snapshotKeys);

  // Process each snapshot
  for (const timestamp of meta.logTimeline) {
    const dataKey = `data_${userId}_${timestamp}`;
    const record = snapshotsResult[dataKey] as SnapshotRecord | undefined;

    if (!record) {
      logger.info(`Snapshot record not found: ${dataKey}`);
      continue;
    }

    try {
      await database.snapshots.add({
        belongToId: userId,
        isCheckpoint: record.isCheckpoint ? 1 : 0,
        timestamp,
        followers: {
          add: record.followers.add || [],
          rem: record.followers.rem || [],
        },
        following: {
          add: record.following.add || [],
          rem: record.following.rem || [],
        },
      });
      stats.snapshots++;
    } catch (error) {
      // Skip if already exists (in case of re-running migration)
      if (error instanceof Error && !error.message.includes("Key already exists")) {
        logger.error(`Failed to migrate snapshot ${dataKey}:`, error);
        stats.errors.push(`Snapshot ${dataKey}: ${error}`);
      }
    }
  }

  logger.info(`Completed migration for user ${userId}`);
}

/**
 * Migrate cron jobs from chrome.storage to IndexedDB
 */
async function migrateCrons(stats: MigrationStats): Promise<void> {
  logger.info("Migrating cron jobs...");

  try {
    const result = await chrome.storage.local.get("crons");
    const crons = result.crons as
      | Record<string, { userId?: string; uid?: string; interval: number; lastRun: number }>
      | undefined;

    if (!crons || Object.keys(crons).length === 0) {
      logger.info("No crons found in chrome.storage");
      return;
    }

    for (const [userId, cron] of Object.entries(crons)) {
      try {
        // Handle both old and new format
        const uid = cron.uid || cron.userId || userId;
        await database.crons.put({
          uid,
          interval: cron.interval,
          lastRun: cron.lastRun,
        });
        stats.crons++;
      } catch (error) {
        logger.error(`Failed to migrate cron for user ${userId}:`, error);
        stats.errors.push(`Cron ${userId}: ${error}`);
      }
    }

    logger.info(`Migrated ${stats.crons} cron jobs`);
  } catch (error) {
    logger.error("Failed to migrate crons:", error);
    stats.errors.push(`Crons: ${error}`);
  }
}

/**
 * Check if migration is needed
 */
export async function needsMigration(): Promise<boolean> {
  try {
    // Check if there's any data in chrome.storage
    const allKeys = await chrome.storage.local.getKeys();
    const hasOldData = allKeys.some(
      (key) =>
        key.startsWith("meta_") ||
        key.startsWith("data_") ||
        key === "users_metadata" ||
        key === "crons",
    );

    if (!hasOldData) {
      return false;
    }

    // Check if IndexedDB already has data
    const userCount = await database.userMetadata.count();
    const snapshotCount = await database.snapshots.count();

    // If chrome.storage has data but IndexedDB is empty, we need migration
    return userCount === 0 && snapshotCount === 0;
  } catch (error) {
    logger.error("Failed to check migration status:", error);
    return false;
  }
}

/**
 * Clean up old data from chrome.storage after successful migration
 * WARNING: This will delete all snapshot data from chrome.storage
 */
export async function cleanupOldStorage(): Promise<void> {
  logger.info("Cleaning up old chrome.storage data...");

  try {
    const allKeys = await chrome.storage.local.getKeys();
    const keysToRemove = allKeys.filter(
      (key) =>
        key.startsWith("meta_") ||
        key.startsWith("data_") ||
        key === "users_metadata" ||
        key === "crons",
    );

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      logger.info(`Removed ${keysToRemove.length} old storage keys`);
    } else {
      logger.info("No old storage keys to remove");
    }
  } catch (error) {
    logger.error("Failed to cleanup old storage:", error);
    throw error;
  }
}

/**
 * Full migration workflow with cleanup
 */
export async function runMigrationWithCleanup(): Promise<MigrationStats> {
  const needsMig = await needsMigration();

  if (!needsMig) {
    logger.info("No migration needed");
    return {
      usersMetadata: 0,
      snapshots: 0,
      crons: 0,
      errors: [],
    };
  }

  const stats = await migrateFromChromeStorage();

  if (stats.errors.length === 0) {
    logger.info("Migration successful, cleaning up old data...");
    await cleanupOldStorage();
  } else {
    logger.info("Migration completed with errors, keeping old data as backup");
  }

  return stats;
}
