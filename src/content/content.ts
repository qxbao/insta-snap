import Browser from "webextension-polyfill"
import { ActionType, ExtensionMessage } from "../constants/actions"
import { ExtensionMessageResponse, Status } from "../constants/status"
import {
  retrieveUserFollowersAndFollowing,
  saveUserInfo,
  sendAppDataToBg,
} from "../utils/instagram"
import { findUserId } from "../utils/instagram"
import { createLogger } from "../utils/logger"
import { injectSnapshotButton, setupVueApp } from "./injector"
import { browser } from "../utils/polyfill"

const logger = createLogger("ContentScript")
const locks = {} as Record<string, number>
const uiStore = setupVueApp()

let userdataCache: null | {
  userId: string
  username: string
} = null

function registerMessages(
  message: unknown,
  _sender: Browser.Runtime.MessageSender,
  sendResponse: (response: unknown) => void,
): true {
  logger.debug("Received message:", message)
  const username = window.location.pathname.split("/").filter(Boolean)[0]

  switch ((message as ExtensionMessage).type) {
    case ActionType.TAKE_SNAPSHOT:
      if (locks[username]) {
        logger.info("Snapshot already in progress for user:", username)
        sendResponse({
          status: Status.InProgress,
          payload: null,
        } satisfies ExtensionMessageResponse)
        return true
      }
      if (uiStore) {
        retrieveUserFollowersAndFollowing(username, logger, uiStore)
      }
      else {
        logger.error("UI Store is not initialized.")
      }
      return true
    case ActionType.GET_USER_INFO:
      (async function () {
        if (userdataCache && userdataCache.username === (message as ExtensionMessage).payload) {
          sendResponse({
            status: Status.Done,
            payload: userdataCache.userId,
          } satisfies ExtensionMessageResponse)
        }
        else {
          const userId = await findUserId(username)
          if (!userId) {
            logger.error("Failed to find user ID for username:", username)
            return
          }
          userdataCache = { userId, username }
          logger.info("Retrieved User ID:", userId)

          sendResponse({
            status: Status.Done,
            payload: userId,
          } satisfies ExtensionMessageResponse)
        }
      })()
    default:
      return true
  }
}

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "session" && changes.locks) {
    const newLocks
      = changes["locks"].newValue == undefined
        ? {}
        : (changes["locks"].newValue as Record<string, number>)
    Object.assign(locks, newLocks)
    logger.info("Locks updated from storage:", locks)
  }
})

let lastUrl = location.href

const observer = new MutationObserver(async () => {
  if (location.href !== lastUrl) {
    lastUrl = location.href
    const igpattern = /^https?:\/\/(www\.)?instagram\.com\/([^\/]+)\/?$/
    if (!igpattern.test(location.href)) {
      return
    }

    const username = window.location.pathname.split("/").filter(Boolean)[0]
    await saveUserInfo(username, logger)
  }
})

async function init() {
  const username = window.location.pathname.split("/").filter(Boolean)[0]
  await saveUserInfo(username, logger)
  observer.observe(document, { subtree: true, childList: true, characterData: true })
  browser.runtime.onMessage.addListener(registerMessages)
  sendAppDataToBg()
  injectSnapshotButton(logger, uiStore!)
}

init()
