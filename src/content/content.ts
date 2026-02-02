import { ActionType, ExtensionMessage } from "../constants/actions";
import {
  retrieveUserFollowersAndFollowing,
  saveUserInfo,
} from "../utils/instagram";
import { findUserId } from "../utils/instagram";
import { createLogger } from "../utils/logger";
import { setupVueApp } from "./injector";

const logger = createLogger("ContentScript");
const locks = {} as Record<string, number>;
const uiStore = setupVueApp();

function registerMessages(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void,
): boolean | void {
  logger.debug("Received message:", message);

  switch (message.type) {
    case ActionType.TAKE_SNAPSHOT:
      retrieveUserFollowersAndFollowing(logger, uiStore);
      break;
    case ActionType.GET_USER_INFO:
      const userId = findUserId();
      logger.info("Retrieved User ID:", userId);
      sendResponse({ userId });
      return true;
    case ActionType.SYNC_LOCKS:
      Object.assign(locks, message.payload || {});
      logger.info("Synchronized locks:", locks);
      return true;
    default:
      return false;
  }
}

async function init() {
  await saveUserInfo();
  chrome.runtime.onMessage.addListener(registerMessages);
}

init();
