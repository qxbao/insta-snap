import { defineStore } from "pinia"
import { database } from "../utils/database"
import { createLogger } from "../utils/logger"
import { Minute } from "../constants/time"

const logger = createLogger("AppStore")

export type StorageSchema = {
  locks: Record<string, number>
  crons: SnapshotCron[]
  users_metadata: Record<string, UserMetadata>
  appId: string
  csrfToken: string
  wwwClaim: string
}

export type StorageKey = keyof StorageSchema

interface AppState {
  activeLocks: Record<string, number>
  locksLoaded: boolean
  snapshotCrons: SnapshotCron[]
  scLoaded: boolean
  trackedUsers: TrackedUser[]
  trackedUsersLoaded: boolean
  storageMetadata: StorageEstimate | null
}

// eslint-disable-next-line no-magic-numbers
const LOCK_TIMEOUT = 10 * Minute

export const useAppStore = defineStore("app", {
  state: (): AppState => ({
    activeLocks: {},
    snapshotCrons: [],
    locksLoaded: false,
    scLoaded: false,
    trackedUsers: [],
    trackedUsersLoaded: false,
    storageMetadata: null,
  }),
  actions: {
    async loadLocks() {
      const res = await chrome.storage.session.get("locks")
      this.activeLocks = (res.locks as Record<string, number>) || {}
      this.locksLoaded = true
    },

    async loadStorageMetadata(): Promise<void> {
      try {
        const estimation = await navigator.storage.estimate()
        this.storageMetadata = { usage: estimation.usage || 0, quota: estimation.quota || 0 }
      }
      catch (error) {
        logger.error("Failed to load storage metadata:", error)
        this.storageMetadata = null
      }
    },

    async tryLockUser(userId: string): Promise<boolean> {
      const res = await chrome.storage.session.get("locks")
      const locks = { ...(res.locks || {}) } as Record<string, number>
      const now = Date.now()

      if (locks[userId]) {
        if (now - locks[userId] < LOCK_TIMEOUT) {
          this.activeLocks = locks
          this.locksLoaded = true
          return false
        }
      }

      locks[userId] = now
      await chrome.storage.session.set({ locks })

      this.activeLocks = locks
      this.locksLoaded = true
      return true
    },

    async unlockUser(userId: string): Promise<void> {
      const res = await chrome.storage.session.get("locks")
      const locks = { ...(res.locks || {}) } as Record<string, number>

      if (userId in locks) {
        delete locks[userId]
        await chrome.storage.session.set({ locks })
        this.activeLocks = locks
      }
    },

    async loadSnapshotCrons() {
      try {
        this.snapshotCrons = await database.getAllCrons()
        this.scLoaded = true
      }
      catch (error) {
        logger.error("Failed to load crons:", error)
        this.snapshotCrons = []
        this.scLoaded = true
      }
    },

    async addUserSnapshotCron(userId: string, interval: number) {
      if (!this.scLoaded) await this.loadSnapshotCrons()
      if (interval <= 0) return
      await database.saveCron(userId, interval, 0)
      this.loadSnapshotCrons()
    },

    async removeUserSnapshotCron(userId: string) {
      if (!this.scLoaded) await this.loadSnapshotCrons()
      await database.deleteCron(userId)
      this.snapshotCrons = this.snapshotCrons.filter(cron => cron.uid !== userId)
    },

    async loadTrackedUsers() {
      try {
        this.trackedUsers = await database.getAllTrackedUsersWithMetadata()
        this.trackedUsersLoaded = true
      }
      catch (error) {
        logger.error("Failed to load tracked users:", error)
        throw error
      }
    },

    async refreshTrackedUsers() {
      await this.loadTrackedUsers()
    },

    async deleteTrackedUser(userId: string) {
      await database.deleteUserData(userId)
      this.trackedUsers = this.trackedUsers.filter(user => user.id !== userId)
    },
  },
})
