import { ActionType } from "./constants/actions";
import { ExtensionRules } from "./constants/rules";
import { typedStorage } from "./stores/app.store";
import { Node } from "./types/instapi";
import { getJitter } from "./utils/alarms";
import { fetchUsers } from "./utils/instagram";
import { createLogger } from "./utils/logger";
import { saveCompleteSnapshot } from "./utils/storage";

const logger = createLogger("Background");

chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: ExtensionRules.map((rule) => rule.id),
    addRules: ExtensionRules,
  });
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
          console.error("Failed to update locks:", error);
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
    const appId = (await chrome.storage.local.get("appId")).appId as
      | undefined
      | string;
    const csrfToken = (await chrome.storage.local.get("csrfToken"))
      .csrfToken as undefined | string;

    const wwwClaim = (await chrome.storage.local.get("wwwClaim")).wwwClaim as
      | undefined
      | string;

    if (!appId || !csrfToken || !wwwClaim) {
      logger.error("App data missing, cannot process snapshot subscriptions.", {
        appData: { appId, csrfToken, wwwClaim },
      });
      return;
    }

    const crons = await typedStorage.get('crons');

    if (!crons) {
      await chrome.storage.local.set({ crons: {} });
      return;
    }

    const now = Date.now();
    for (const userId in crons) {
      logger.info(`Processing snapshot cron for user: ${userId}`);
      // TODO: Follower/following only opt
      const cron = crons[userId];
      if (now - cron.lastRun * 60 * 60 * 1000 >= cron.interval) {
        let followers: Node[] = [];
        logger?.info("Fetching followers...");
        const flwerRes = await fetchUsers(
          userId,
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

        let following: Node[] = [];
        logger?.info("Fetching following...");
        const flwingRes = await fetchUsers(
          userId,
          "following",
          appId,
          csrfToken,
          wwwClaim,
          logger,
        );
        if (flwingRes === false) return false;

        following = flwingRes;
        await saveCompleteSnapshot(userId, followers, following, logger);
        // TODO: Magic numbers
        await new Promise((resolve) =>
          setTimeout(resolve, getJitter(5000, 15000)),
        );
        crons[userId].lastRun = now;
      }
    }
    await chrome.storage.local.set({ crons });
  }
});
