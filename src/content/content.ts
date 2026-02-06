import { ActionType, ExtensionMessage } from "../constants/actions";
import { ExtensionMessageResponse, Status } from "../constants/status";
import {
  retrieveUserFollowersAndFollowing,
  saveUserInfo,
  sendAppDataToBg,
} from "../utils/instagram";
import { findUserId } from "../utils/instagram";
import { createLogger } from "../utils/logger";
import { setupVueApp } from "./injector";

const logger = createLogger("ContentScript");
const locks = {} as Record<string, number>;
const uiStore = setupVueApp();

let userdataCache: null | {
  userId: string;
  username: string;
} = null;

function registerMessages(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: ExtensionMessageResponse) => void,
): boolean | void {
  logger.debug("Received message:", message);
  const username = window.location.pathname.split("/").filter(Boolean)[0];

  switch (message.type) {
    case ActionType.TAKE_SNAPSHOT:
      if (uiStore) {
        retrieveUserFollowersAndFollowing(username, logger, uiStore);
      } else {
        logger.error("UI Store is not initialized.");
      }
      break;
    case ActionType.GET_USER_INFO:
      (async function () {
        if (userdataCache && userdataCache.username === message.payload) {
          sendResponse({
            status: Status.Done,
            payload: userdataCache.userId,
          } satisfies ExtensionMessageResponse);
        } else {
          const userId = await findUserId(username);
          if (!userId) {
            logger.error("Failed to find user ID for username:", username);
            return;
          }
          userdataCache = { userId, username };
          logger.info("Retrieved User ID:", userId);

          sendResponse({
            status: Status.Done,
            payload: userId,
          } satisfies ExtensionMessageResponse);
        }
      })();
      return true;
    case ActionType.SYNC_LOCKS:
      Object.assign(locks, message.payload || {});
      logger.info("Synchronized locks:", locks);
      break;
    default:
      return false;
  }
}

async function init() {
  const username = window.location.pathname.split("/").filter(Boolean)[0];
  await saveUserInfo(username, logger);
  chrome.runtime.onMessage.addListener(registerMessages);
  sendAppDataToBg();
}

init();
