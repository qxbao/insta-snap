import { ActionType, ExtensionMessage } from "./constants/actions";
import { retrieveUserFollowersAndFollowing } from "./utils/instagram";
import { findUserId } from "./utils/instagram";
import { createLogger } from "./utils/logger";
import { getGlobalUserMap } from "./utils/storage";

const logger = createLogger("content");

function registerMessages(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void,
): boolean | void {
  logger.debug("Received message:", message);

  if (message.type === ActionType.TAKE_SNAPSHOT) {
    retrieveUserFollowersAndFollowing(logger);
    return true;
  }

  if (message.type === ActionType.GET_USER_INFO) {
    const userId = findUserId();
    logger.info("Retrieved User ID:", userId);
    sendResponse({ userId });
    return true;
  }

  return false;
}

async function saveUserInfo() {
  const userId = findUserId();
  const globalUserMap = await getGlobalUserMap();
  let retry = 0;
  logger.info("Saving user info with UID =", userId);
  if (!(userId in globalUserMap) && userId) {
    const username = window.location.pathname.split("/").filter(Boolean)[0];
    let full_name_elems = document.getElementsByClassName("x1lliihq x1plvlek xryxfnj x1n2onr6 xyejjpt x15dsfln x193iq5w xeuugli x1fj9vlw x13faqbe x1vvkbs x1s928wv xhkezso x1gmr53x x1cpjm7i x1fgarty x1943h6x x1i0vuye xvs91rp xo1l8bm x5n08af x10wh9bi xpm28yp x8viiok x1o7cslx",
    ) as HTMLCollectionOf<HTMLElement>;
    let full_name_elem;
    while (retry < 5 && full_name_elems.length === 0) {
      logger.info("Retrying to get full name element, attempt", retry + 1);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      full_name_elems = document.getElementsByClassName("x1lliihq x1plvlek xryxfnj x1n2onr6 xyejjpt x15dsfln x193iq5w xeuugli x1fj9vlw x13faqbe x1vvkbs x1s928wv xhkezso x1gmr53x x1cpjm7i x1fgarty x1943h6x x1i0vuye xvs91rp xo1l8bm x5n08af x10wh9bi xpm28yp x8viiok x1o7cslx",
      ) as HTMLCollectionOf<HTMLElement>;
      retry++;
    }
    if (full_name_elems.length > 0) {
      full_name_elem = full_name_elems[0];
    } else {
      logger.error("Failed to retrieve full name element.");
      return;
    }
    const img_elem = document.querySelectorAll(
      "img.xpdipgo.x972fbf.x10w94by.x1qhh985",
    ) as NodeListOf<HTMLImageElement>;
    if (img_elem.length <= 1) {
      logger.error("Failed to retrieve profile picture URL.");
      return;
    }

    if (!full_name_elem) {
      logger.error("Failed to retrieve full name.");
      return;
    }

    const profile_pic_url = img_elem[1].src;
    const userData = {
      username,
      profile_pic_url,
      full_name: full_name_elem.textContent,
      last_updated: Date.now(),
    };

    logger.info("Retrieved user data:", userData);
    globalUserMap[userId] = userData;

    await chrome.storage.local.set({ users_metadata: globalUserMap });
    logger.info("Saved user info to storage:", globalUserMap[userId]);
  }
}

saveUserInfo();

chrome.runtime.onMessage.addListener(registerMessages);
