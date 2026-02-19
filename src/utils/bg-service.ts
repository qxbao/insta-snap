import { ActionType, ExtensionMessage } from "../constants/actions"
import { database } from "./database"
import { Encryptor } from "./encrypt"
import { createLogger } from "./logger"
import { fetchUsers } from "./instagram"
import { getJitter } from "./alarms"
import { UserNode } from "../types/instapi"
import { Hour, Second } from "../constants/time"
import Browser from "webextension-polyfill"
import { browser } from "./polyfill"

export class BackgroundService {
  private logger = createLogger("BackgroundService")
  private encryptor?: Encryptor
  private initPromise: Promise<void>
  private isAlarmProcessing = false
  private alarmAbortController: AbortController | null = null

  constructor() {
    this.initPromise = this.checkSecurityConfig()
  }

  /**
   * Ensures encryption system is ready before processing secure messages
   * @throws Error if security initialization failed
   */
  private async ensureReady(): Promise<void> {
    await this.initPromise
    if (!this.encryptor) {
      throw new Error("Security system failed to initialize")
    }
  }

  async checkSecurityConfig(): Promise<void> {
    try {
      this.logger.info("Checking security config...")

      const keyConfig = await database.internalConfig.get("encryptionKey")

      if (!keyConfig) {
        this.logger.warn("Generating new encryption key...")
        this.encryptor = await Encryptor.new()
        const cryptoKey = this.encryptor.getKey()

        if (!cryptoKey) {
          throw new Error("Failed to generate encryption key")
        }

        await database.internalConfig.put({
          key: "encryptionKey",
          value: cryptoKey,
        })
        this.logger.info("Encryption key generated and stored.")
      }
      else {
        if (!(keyConfig.value instanceof CryptoKey)) {
          throw new Error("Invalid encryption key format in database")
        }
        this.encryptor = await Encryptor.new(keyConfig.value)
        this.logger.info("Encryption key loaded from database.")
      }

      const keysToMigrate = ["wwwClaim", "appId", "csrfToken"]
      const [localData, existingConfigs] = await Promise.all([
        browser.storage.local.get(keysToMigrate),
        Promise.all(keysToMigrate.map(key => database.internalConfig.get(key))),
      ])

      const migratePromises: Promise<void>[] = []
      const keysToRemove: string[] = []

      for (let i = 0; i < keysToMigrate.length; i++) {
        const key = keysToMigrate[i]
        const val = localData[key]
        const existing = existingConfigs[i]

        if (!existing && val && typeof val === "string") {
          this.logger.warn(`Migrating "${key}" to encrypted storage...`)
          migratePromises.push(database.writeEncryptedConfig(key, val, this.encryptor))
          keysToRemove.push(key)
        }
        else if (existing && val) {
          keysToRemove.push(key)
        }
      }

      await Promise.all([
        ...migratePromises,
        keysToRemove.length > 0 ? browser.storage.local.remove(keysToRemove) : Promise.resolve(),
      ])

      if (keysToRemove.length > 0) {
        this.logger.info(
          `Migration complete: ${keysToRemove.join(", ")} cleaned from browser.storage`,
        )
      }
    }
    catch (error) {
      this.logger.error("Security init failed:", error)
      throw error
    }
  }

  /**
   * Initialize Chrome alarms for periodic snapshot checks
   */
  initializeAlarms(): void {
    browser.alarms.create(ActionType.CHECK_SNAPSHOT_SUBSCRIPTIONS, {
      periodInMinutes: 30,
    })
    this.logger.info("Snapshot subscription alarm initialized (30min interval)")
  }

  /**
   * Handle alarm events for cron-based snapshots
   */
  async handleAlarm(alarm: Browser.Alarms.Alarm): Promise<void> {
    if (alarm.name !== ActionType.CHECK_SNAPSHOT_SUBSCRIPTIONS) {
      return
    }

    if (this.isAlarmProcessing) {
      this.logger.info("Cancelling previous alarm execution")
      this.alarmAbortController?.abort()
    }

    this.alarmAbortController = new AbortController()
    this.isAlarmProcessing = true

    try {
      await this.ensureReady()

      if (this.alarmAbortController.signal.aborted) return

      // Read encrypted credentials
      const [appIdConfig, csrfConfig, wwwClaimConfig] = await Promise.all([
        database.readEncryptedConfig("appId", this.encryptor!),
        database.readEncryptedConfig("csrfToken", this.encryptor!),
        database.readEncryptedConfig("wwwClaim", this.encryptor!),
      ])

      if (!appIdConfig || !csrfConfig || !wwwClaimConfig) {
        this.logger.error("App data missing, cannot process snapshot subscriptions.")
        return
      }

      const crons = await database.getAllCrons()

      if (crons.length === 0) {
        this.logger.info("No crons found, skipping...")
        return
      }

      const now = Date.now()
      for (const cron of crons) {
        if (this.alarmAbortController.signal.aborted) break

        this.logger.info(`Processing snapshot cron for user: ${cron.uid}`)

        if (now - cron.lastRun >= cron.interval * Hour) {
          await this.processCronSnapshot(
            cron.uid,
            appIdConfig,
            csrfConfig,
            wwwClaimConfig,
            now,
            cron.interval,
          )

          // eslint-disable-next-line no-magic-numbers
          const JLowerBound = 5 * Second, JUpperBound = 15 * Second
          await new Promise(resolve => setTimeout(resolve, getJitter(JLowerBound, JUpperBound)))
        }
      }
    }
    catch (error) {
      this.logger.error("Alarm processing failed:", error)
    }
    finally {
      this.isAlarmProcessing = false
      this.alarmAbortController = null
    }
  }

  /**
   * Process a single cron snapshot for a user
   */
  private async processCronSnapshot(
    uid: string,
    appId: string,
    csrfToken: string,
    wwwClaim: string,
    timestamp: number,
    interval: number,
  ): Promise<void> {
    let followers: UserNode[] = []
    this.logger.info("Fetching followers...")
    const flwerRes = await fetchUsers(uid, "followers", appId, csrfToken, wwwClaim, this.logger)
    if (flwerRes === false) {
      this.logger.error(`Failed to fetch followers for user ${uid}`)
      return
    }
    followers = flwerRes

    let following: UserNode[] = []
    this.logger.info("Fetching following...")
    const flwingRes = await fetchUsers(uid, "following", appId, csrfToken, wwwClaim, this.logger)
    if (flwingRes === false) {
      this.logger.error(`Failed to fetch following for user ${uid}`)
      return
    }
    following = flwingRes

    await database.bulkUpsertUserMetadata([...followers, ...following])
    await database.saveSnapshot(
      uid,
      timestamp,
      followers.map(f => f.id),
      following.map(f => f.id),
    )
    await database.saveCron(uid, interval, timestamp)
    this.logger.info(`Cron snapshot completed for user ${uid}`)
  }

  registerMessageListener(
    message: unknown,
    sender: Browser.Runtime.MessageSender,
    sendResponse: Browser.Runtime.OnMessageListenerNoResponse,
  ): true {
    const secureActions = [ActionType.SEND_APP_DATA] as const
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (secureActions.includes((message as ExtensionMessage).type as any)) {
      this.ensureReady()
        .then(() => this.routeMessage((message as ExtensionMessage), sender, sendResponse))
        .catch((error) => {
          this.logger.error("Failed to ensure security ready:", error)
          sendResponse({ success: false, error: error.message }, sender)
        })
      return true
    }

    return this.routeMessage((message as ExtensionMessage), sender, sendResponse)
  }

  private routeMessage(
    message: ExtensionMessage,
    sender: Browser.Runtime.MessageSender,
    sendResponse: Browser.Runtime.OnMessageListenerNoResponse,
  ): true {
    switch (message.type) {
      case ActionType.NOTIFY_SNAPSHOT_COMPLETE:
        this.handleSnapshotComplete(message.payload, sender, sendResponse)
        break

      case ActionType.SEND_APP_DATA:
        this.handleAppData(message.payload)
          .then(() => sendResponse({ success: true }, sender))
          .catch((error) => {
            this.logger.error("Failed to save app data:", error)
            sendResponse({ success: false, error: error.message }, sender)
          })
        break

      case ActionType.SAVE_USER_METADATA:
        database.userMetadata
          .put(message.payload)
          .then(() => sendResponse({ success: true }, sender))
          .catch((error) => {
            this.logger.error("Failed to save user metadata:", error)
            sendResponse({ success: false, error: error.message }, sender)
          })
        break

      case ActionType.BULK_UPSERT_USER_METADATA:
        database
          .bulkUpsertUserMetadata(message.payload)
          .then(() => sendResponse({ success: true }, sender))
          .catch((error) => {
            this.logger.error("Failed to bulk upsert metadata:", error)
            sendResponse({ success: false, error: error.message }, sender)
          })
        break

      case ActionType.SAVE_SNAPSHOT:
        const { userId, timestamp, followerIds, followingIds } = message.payload
        database
          .saveSnapshot(userId, timestamp, followerIds, followingIds)
          .then(() => sendResponse({ success: true }, sender))
          .catch((error) => {
            this.logger.error("Failed to save snapshot:", error)
            sendResponse({ success: false, error: error.message }, sender)
          })
        break

      default:
        sendResponse({ success: false, error: "Unknown action type" }, sender)
    }

    return true
  }

  private handleSnapshotComplete(
    uid: string,
    sender: Browser.Runtime.MessageSender,
    sendResponse: Browser.Runtime.OnMessageListenerNoResponse,
  ): void {
    browser.storage.session
      .get("locks")
      .then((res) => {
        const locks = { ...(res.locks || {}) } as Record<string, number>
        if (uid in locks) {
          delete locks[uid]
          return browser.storage.session.set({ locks, lastsync: Date.now() })
        }
        return browser.storage.session.set({ lastsync: Date.now() })
      })
      .then(() => sendResponse({ success: true }, sender))
      .catch((error) => {
        this.logger.error("Failed to update locks:", error)
        sendResponse({ success: false, error: error.message }, sender)
      })
  }

  private async handleAppData(payload: Record<string, string>): Promise<void> {
    if (!this.encryptor) {
      throw new Error("Encryptor not initialized")
    }

    const validEntries = Object.entries(payload).filter(([key, value]) => {
      if (typeof value !== "string") {
        this.logger.warn(`Skipping non-string value for key "${key}"`)
        return false
      }
      return true
    })

    for (const [key, value] of validEntries) {
      await database.writeEncryptedConfig(key, value, this.encryptor)
    }
  }
}
