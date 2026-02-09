import { ActionType } from "./constants/actions";
import { ExtensionRules } from "./constants/rules";
import { UserNode } from "./types/instapi";
import { getJitter } from "./utils/alarms";
import { fetchUsers } from "./utils/instagram";
import { createLogger } from "./utils/logger";
import { database } from "./utils/database";
import { runMigrationWithCleanup } from "./utils/migrate";

const logger = createLogger("Background");

let isAlarmProcessing = false;

chrome.runtime.onInstalled.addListener(async (details) => {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: ExtensionRules.map((rule) => rule.id),
    addRules: ExtensionRules,
  });

  // Run migration on install or update
  if (details.reason === "install" || details.reason === "update") {
    try {
      logger.info("Checking for data migration...");
      const stats = await runMigrationWithCleanup();
      if (stats.usersMetadata > 0 || stats.snapshots > 0 || stats.crons > 0) {
        logger.info("Migration completed:", stats);
      }
    } catch (error) {
      logger.error("Migration failed:", error);
    }
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "session" && changes["locks"]) {
    const newLocks = changes["locks"].newValue;
    if (newLocks === undefined) {
      chrome.runtime
        .sendMessage({
          type: ActionType.SYNC_LOCKS,
          payload: {},
        })
        .catch(() => {});
    } else {
      chrome.runtime
        .sendMessage({
          type: ActionType.SYNC_LOCKS,
          payload: newLocks,
        })
        .catch(() => {});
    }
  }
});

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  switch (message.type) {
    case ActionType.NOTIFY_SNAPSHOT_COMPLETE:
      const userId = message.payload;
      chrome.storage.session
        .get("locks")
        .then((res) => {
          const locks = { ...(res.locks || {}) } as Record<string, number>;
          if (userId in locks) {
            delete locks[userId];
            chrome.storage.session.set({ locks });
          }
        })
        .catch((error) => {
          logger.error("Failed to update locks:", error);
        });
      break;
    case ActionType.SEND_APP_DATA:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newData: Record<string, any> = {};
      for (const key in message.payload) {
        newData[key] = message.payload[key];
      }
      chrome.storage.local.set(newData);
      break;
    default:
      return;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ActionType.CHECK_SNAPSHOT_SUBSCRIPTIONS, {
    periodInMinutes: 30,
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  logger.info(`Alarm triggered: ${alarm.name}`);
  if (alarm.name === ActionType.CHECK_SNAPSHOT_SUBSCRIPTIONS) {
    if (isAlarmProcessing) {
      logger.info("Previous alarm execution still in progress, skipping...");
      return;
    }

    isAlarmProcessing = true;

    try {
      const appId = (await chrome.storage.local.get("appId")).appId as
        | undefined
        | string;
      const csrfToken = (await chrome.storage.local.get("csrfToken"))
        .csrfToken as undefined | string;

      const wwwClaim = (await chrome.storage.local.get("wwwClaim")).wwwClaim as
        | undefined
        | string;

      if (!appId || !csrfToken || !wwwClaim) {
        logger.error(
          "App data missing, cannot process snapshot subscriptions.",
          {
            appData: { appId, csrfToken, wwwClaim },
          },
        );
        return;
      }

      const crons = await database.getAllCrons();

      if (crons.length === 0) {
        logger.info("No crons found, skipping...");
        return;
      }

      const now = Date.now();
      for (const cron of crons) {
        logger.info(`Processing snapshot cron for user: ${cron.uid}`);
        // TODO: Follower/following only opt
        if (now - cron.lastRun >= cron.interval * 60 * 60 * 1000) {
          let followers: UserNode[] = [];
          logger?.info("Fetching followers...");
          const flwerRes = await fetchUsers(
            cron.uid,
            "followers",
            appId,
            csrfToken,
            wwwClaim,
            logger,
          );
          if (flwerRes === false) {
            return false;
          }
          followers = flwerRes;

          let following: UserNode[] = [];
          logger?.info("Fetching following...");
          const flwingRes = await fetchUsers(
            cron.uid,
            "following",
            appId,
            csrfToken,
            wwwClaim,
            logger,
          );
          if (flwingRes === false) return false;

          following = flwingRes;
          await database.bulkUpsertUserMetadata([...followers, ...following]);
          const timestamp = Date.now();
          await database.saveSnapshot(
            cron.uid,
            timestamp,
            followers.map((f) => f.id),
            following.map((f) => f.id),
          );
          // TODO: Magic numbers
          await new Promise((resolve) =>
            setTimeout(resolve, getJitter(5000, 15000)),
          );
          await database.saveCron(cron.uid, cron.interval, now);
        }
      }
    } finally {
      isAlarmProcessing = false;
      logger.info("Alarm execution completed");
    }
  }
});
