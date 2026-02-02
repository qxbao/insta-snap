import { defineStore } from "pinia";

interface SharedState {
  activeLocks: Record<string, number>;
}

const LOCK_TIMEOUT = 10 * 60 * 1000; // 10m

export const useSharedStore = defineStore("shared", {
  state: (): SharedState => ({
    activeLocks: {},
  }),
  actions: {
    async loadLocks() {
      const res = await chrome.storage.session.get("locks");
      this.activeLocks = (res.locks as Record<string, number>) || {};
    },

    async tryLockUser(userId: string): Promise<boolean> {
      const res = await chrome.storage.session.get("locks");
      const locks = { ...(res.locks || {}) } as Record<string, number>;
      const now = Date.now();

      if (locks[userId]) {
        if (now - locks[userId] < LOCK_TIMEOUT) {
          this.activeLocks = locks;
          return false;
        }
      }

      locks[userId] = now;
      await chrome.storage.session.set({ locks });

      this.activeLocks = locks;
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

    updateLocalState(newLocks: Record<string, number>) {
      this.activeLocks = newLocks || {};
    },
  },
});
