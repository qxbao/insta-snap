import { defineStore } from "pinia";
import { getAllTrackedUsers, deleteUserData } from "../utils/storage";

export interface SnapshotCron {
  userId: string;
  interval: number;
  lastRun: number;
}

export interface TrackedUser {
  userId: string;
  username: string;
  full_name: string;
  profile_pic_url: string;
  snapshotCount: number;
  lastSnapshot: number | null;
  last_updated: number;
}

interface AppState {
  activeLocks: Record<string, number>;
  locksLoaded: boolean;
  snapshotCrons: Record<string, SnapshotCron>;
  scLoaded: boolean;
  trackedUsers: TrackedUser[];
  trackedUsersLoaded: boolean;
}

const LOCK_TIMEOUT = 10 * 60 * 1000; // 10m

export const useAppStore = defineStore("app", {
  state: (): AppState => ({
    activeLocks: {},
    snapshotCrons: {},
    locksLoaded: false,
    scLoaded: false,
    trackedUsers: [],
    trackedUsersLoaded: false,
  }),
  actions: {
    async loadLocks() {
      const res = await chrome.storage.session.get("locks");
      this.activeLocks = (res.locks as Record<string, number>) || {};
      this.locksLoaded = true;
    },

    async tryLockUser(userId: string): Promise<boolean> {
      const res = await chrome.storage.session.get("locks");
      const locks = { ...(res.locks || {}) } as Record<string, number>;
      const now = Date.now();

      if (locks[userId]) {
        if (now - locks[userId] < LOCK_TIMEOUT) {
          this.activeLocks = locks;
          this.locksLoaded = true;
          return false;
        }
      }

      locks[userId] = now;
      await chrome.storage.session.set({ locks });

      this.activeLocks = locks;
      this.locksLoaded = true;
      return true;
    },

    async unlockUser(userId: string): Promise<void> {
      const res = await chrome.storage.session.get("locks");
      const locks = { ...(res.locks || {}) } as Record<string, number>;

      if (userId in locks) {
        delete locks[userId];
        await chrome.storage.session.set({ locks });
        this.activeLocks = locks;
      }
    },

    async loadSnapshotCrons() {
      const res = await chrome.storage.local.get("crons");
      if (!res.crons) {
        await chrome.storage.local.set({ crons: {} });
        this.snapshotCrons = {};
        this.scLoaded = true;
      } else {
        this.snapshotCrons = (res.crons as Record<string, SnapshotCron>) || {};
        this.scLoaded = true;
      }
    },

    async addUserSnapshotCron(userId: string, interval: number) {
      if (!this.scLoaded) await this.loadSnapshotCrons();
      if (interval <= 0) return;
      this.snapshotCrons[userId] = {
        userId,
        interval,
        lastRun: 0,
      };
      await chrome.storage.local.set({ crons: this.snapshotCrons });
    },

    async removeUserSnapshotCron(userId: string) {
      if (!(userId in this.snapshotCrons)) return;
      if (!this.scLoaded) await this.loadSnapshotCrons();
      delete this.snapshotCrons[userId];
      await chrome.storage.local.set({ crons: this.snapshotCrons });
    },

    async loadTrackedUsers() {
      try {
        this.trackedUsers = await getAllTrackedUsers();
        this.trackedUsersLoaded = true;
      } catch (error) {
        console.error("Failed to load tracked users:", error);
        throw error;
      }
    },

    async refreshTrackedUsers() {
      await this.loadTrackedUsers();
    },

    async deleteTrackedUser(userId: string) {
      await deleteUserData(userId);
      this.trackedUsers = this.trackedUsers.filter(user => user.userId !== userId);
    },
  },
});
