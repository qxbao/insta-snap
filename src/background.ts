import { ActionType } from "./constants/actions"
import { ExtensionRules } from "./constants/rules"
import { createLogger } from "./utils/logger"
import { runMigrationWithCleanup } from "./utils/migrate"
import { BackgroundService } from "./utils/bg-service"
import "./utils/polyfill"

const logger = createLogger("Background")
const service = new BackgroundService()

browser.runtime.onInstalled.addListener(async (details) => {
  browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: ExtensionRules.map(rule => rule.id),
    addRules: ExtensionRules,
  })

  if (details.reason === "install" || details.reason === "update") {
    await service.checkSecurityConfig()
    try {
      logger.info("Checking for data migration...")
      const stats = await runMigrationWithCleanup()
      if (stats.usersMetadata > 0 || stats.snapshots > 0 || stats.crons > 0) {
        logger.info("Migration completed:", stats)
      }
    }
    catch (error) {
      logger.error("Migration failed:", error)
    }
  }

  service.initializeAlarms()
})

browser.runtime.onStartup.addListener(async () => {
  await service.checkSecurityConfig()
})

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "session" && changes["locks"]) {
    const newLocks = changes["locks"].newValue
    browser.runtime
      .sendMessage({
        type: ActionType.SYNC_LOCKS,
        payload: newLocks ?? {},
      })
      .catch(() => {})
  }
})

browser.runtime.onMessage.addListener(service.registerMessageListener.bind(service))

browser.alarms.onAlarm.addListener((alarm) => {
  service.handleAlarm(alarm).catch((error) => {
    logger.error("Alarm handler failed:", error)
  })
})
