import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAppStore } from "../../stores/app.store";
import { createMockStorage } from "../utils/test-helpers";
import { database } from "../../utils/database";
import { IDBFactory } from "fake-indexeddb";

describe("useAppStore", () => {
  let mockSessionStorage: ReturnType<typeof createMockStorage>;

  beforeEach(async () => {
    // Reset IndexedDB for each test
    globalThis.indexedDB = new IDBFactory();
    
    setActivePinia(createPinia());
    
    // Reset mock storage
    mockSessionStorage = createMockStorage();

    // Mock chrome storage APIs (only session for locks)
    global.chrome.storage.session.get = mockSessionStorage.get as any;
    global.chrome.storage.session.set = mockSessionStorage.set as any;
    
    // Ensure database is open and clear all data
    if (!database.isOpen()) {
      await database.open();
    }
    await database.crons.clear();
    await database.snapshots.clear();
    await database.userMetadata.clear();
  });

  afterEach(async () => {
    // Clean up database after each test - don't close, just clear
    try {
      await database.crons.clear();
      await database.snapshots.clear();
      await database.userMetadata.clear();
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  describe("Lock Management", () => {
    it("should load locks from session storage", async () => {
      const mockLocks = {
        user_123: Date.now(),
        user_456: Date.now() - 60000,
      };
      mockSessionStorage.data.set("locks", mockLocks);

      const store = useAppStore();
      await store.loadLocks();

      expect(store.locksLoaded).toBe(true);
      expect(store.activeLocks).toEqual(mockLocks);
    });

    it("should handle lock and unlock operations", async () => {
      const store = useAppStore();
      const userId = "user_123";

      // Lock user successfully when no existing lock
      let locked = await store.tryLockUser(userId);
      expect(locked).toBe(true);
      expect(store.activeLocks[userId]).toBeDefined();

      // Fail to lock user if lock is recent
      locked = await store.tryLockUser(userId);
      expect(locked).toBe(false);

      // Unlock user successfully
      await store.unlockUser(userId);
      expect(store.activeLocks[userId]).toBeUndefined();
    });

    it("should lock user if previous lock is expired", async () => {
      const userId = "user_123";
      const expiredLock = Date.now() - 11 * 60 * 1000; // 11 minutes ago (expired)
      mockSessionStorage.data.set("locks", { [userId]: expiredLock });

      const store = useAppStore();
      const locked = await store.tryLockUser(userId);

      expect(locked).toBe(true);
      expect(store.activeLocks[userId]).toBeGreaterThan(expiredLock);
    });
  });


  describe("Snapshot Cron Management", () => {
    it("should load snapshot crons from storage", async () => {
      const testCron = {
        uid: "user_123",
        interval: 24,
        lastRun: Date.now() - 3600000,
      };
      
      await database.saveCron(testCron.uid, testCron.interval, testCron.lastRun);

      const store = useAppStore();
      await store.loadSnapshotCrons();

      expect(store.scLoaded).toBe(true);
      expect(store.snapshotCrons).toHaveLength(1);
      expect(store.snapshotCrons[0].uid).toBe("user_123");
      expect(store.snapshotCrons[0].interval).toBe(24);
    });

    it("should add and update snapshot cron", async () => {
      const store = useAppStore();
      const userId = "user_123";
      const interval = 48;

      // Add new cron
      await store.addUserSnapshotCron(userId, interval);

      let cronInDb = await database.getCron(userId);
      expect(cronInDb).toBeDefined();
      expect(cronInDb?.interval).toBe(interval);
      expect(cronInDb?.uid).toBe(userId);

      // Update existing cron
      const newInterval = 72;
      await store.addUserSnapshotCron(userId, newInterval);

      cronInDb = await database.getCron(userId);
      expect(cronInDb?.interval).toBe(newInterval);
      expect(cronInDb?.lastRun).toBe(0);
    });

    it("should remove user snapshot cron", async () => {
      const userId = "user_123";
      await database.saveCron(userId, 24, Date.now());
      await database.saveCron("user_456", 12, Date.now());

      const store = useAppStore();
      await store.loadSnapshotCrons();
      
      expect(store.snapshotCrons).toHaveLength(2);
      
      await store.removeUserSnapshotCron(userId);

      expect(store.snapshotCrons).toHaveLength(1);
      expect(store.snapshotCrons[0].uid).toBe("user_456");
      
      const cronInDb = await database.getCron(userId);
      expect(cronInDb).toBeUndefined();
    });
  });


  describe("Tracked Users", () => {
    it("should load and delete tracked users", async () => {
      // Add two test users
      await database.userMetadata.bulkAdd([
        {
          id: "user_123",
          username: "testuser",
          fullName: "Test User",
          avatarURL: "https://example.com/pic.jpg",
          updatedAt: Date.now(),
        },
        {
          id: "user_456",
          username: "anotheruser",
          fullName: "Another User",
          avatarURL: "https://example.com/pic2.jpg",
          updatedAt: Date.now(),
        },
      ]);

      // Add snapshots for both users
      await database.saveSnapshot("user_123", Date.now(), ["f1"], ["f2"]);
      await database.saveSnapshot("user_456", Date.now(), ["f3"], ["f4"]);

      const store = useAppStore();
      await store.loadTrackedUsers();

      expect(store.trackedUsersLoaded).toBe(true);
      expect(store.trackedUsers).toHaveLength(2);
      expect(store.trackedUsers[0].id).toBe("user_123");
      expect(store.trackedUsers[0].username).toBe("testuser");

      // Delete one user
      await store.deleteTrackedUser("user_123");

      expect(store.trackedUsers).toHaveLength(1);
      expect(store.trackedUsers[0].id).toBe("user_456");

      // Verify data was deleted from database
      const snapshotsInDb = await database.snapshots
        .where("belongToId")
        .equals("user_123")
        .toArray();
      expect(snapshotsInDb).toHaveLength(0);
    });
  });


  describe("Cron Queries", () => {
    it("should find and check cron existence", async () => {
      await database.saveCron("user_123", 24, Date.now());
      await database.saveCron("user_456", 12, Date.now());

      const store = useAppStore();
      await store.loadSnapshotCrons();

      // Find specific cron
      const cron123 = store.snapshotCrons.find(c => c.uid === "user_123");
      const cron456 = store.snapshotCrons.find(c => c.uid === "user_456");

      expect(cron123).toBeDefined();
      expect(cron456).toBeDefined();
      expect(store.snapshotCrons).toHaveLength(2);

      // Check existence
      const hasCron123 = store.snapshotCrons.some(c => c.uid === "user_123");
      const hasCron999 = store.snapshotCrons.some(c => c.uid === "user_999");

      expect(hasCron123).toBe(true);
      expect(hasCron999).toBe(false);
    });
  });
});
