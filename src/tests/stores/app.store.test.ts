import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAppStore, SnapshotCron } from "../../stores/app.store";
import { createMockStorage } from "../utils/test-helpers";

// Mock storage utilities
vi.mock("../../utils/storage", () => ({
  getAllTrackedUsers: vi.fn().mockResolvedValue([]),
  deleteUserData: vi.fn().mockResolvedValue(undefined),
}));

describe("useAppStore", () => {
  let mockSessionStorage: ReturnType<typeof createMockStorage>;
  let mockLocalStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    setActivePinia(createPinia());
    
    // Reset mock storage
    mockSessionStorage = createMockStorage();
    mockLocalStorage = createMockStorage();

    // Mock chrome storage APIs
    global.chrome.storage.session.get = mockSessionStorage.get as any;
    global.chrome.storage.session.set = mockSessionStorage.set as any;
    global.chrome.storage.local.get = mockLocalStorage.get as any;
    global.chrome.storage.local.set = mockLocalStorage.set as any;
    global.chrome.storage.local.remove = mockLocalStorage.remove as any;
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

    it("should lock user successfully when no existing lock", async () => {
      const store = useAppStore();
      const userId = "user_123";

      const locked = await store.tryLockUser(userId);

      expect(locked).toBe(true);
      expect(store.activeLocks[userId]).toBeDefined();
      expect(mockSessionStorage.set).toHaveBeenCalled();
    });

    it("should fail to lock user if lock is recent", async () => {
      const userId = "user_123";
      const recentLock = Date.now() - 60000; // 1 minute ago
      mockSessionStorage.data.set("locks", { [userId]: recentLock });

      const store = useAppStore();
      const locked = await store.tryLockUser(userId);

      expect(locked).toBe(false);
      expect(store.activeLocks[userId]).toBe(recentLock);
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

    it("should unlock user successfully", async () => {
      const userId = "user_123";
      mockSessionStorage.data.set("locks", { 
        [userId]: Date.now(),
        user_456: Date.now() 
      });

      const store = useAppStore();
      await store.unlockUser(userId);

      expect(store.activeLocks[userId]).toBeUndefined();
      expect(store.activeLocks["user_456"]).toBeDefined();
      expect(mockSessionStorage.set).toHaveBeenCalled();
    });
  });

  describe("Snapshot Cron Management", () => {
    it("should load snapshot crons from storage", async () => {
      const mockCrons: Record<string, SnapshotCron> = {
        user_123: {
          userId: "user_123",
          interval: 24,
          lastRun: Date.now() - 3600000,
        },
      };
      mockLocalStorage.data.set("crons", mockCrons);

      const store = useAppStore();
      await store.loadSnapshotCrons();

      expect(store.scLoaded).toBe(true);
      expect(store.snapshotCrons).toEqual(mockCrons);
    });

    it("should add user snapshot cron", async () => {
      const store = useAppStore();
      const userId = "user_123";
      const interval = 48;

      await store.addUserSnapshotCron(userId, interval);

      expect(store.snapshotCrons[userId]).toBeDefined();
      expect(store.snapshotCrons[userId].interval).toBe(interval);
      expect(store.snapshotCrons[userId].userId).toBe(userId);
      expect(mockLocalStorage.set).toHaveBeenCalled();
    });

    it("should update existing snapshot cron", async () => {
      const userId = "user_123";
      const oldCron: SnapshotCron = {
        userId,
        interval: 24,
        lastRun: Date.now() - 86400000,
      };
      mockLocalStorage.data.set("crons", { [userId]: oldCron });

      const store = useAppStore();
      await store.loadSnapshotCrons();

      const newInterval = 48;
      await store.addUserSnapshotCron(userId, newInterval);

      expect(store.snapshotCrons[userId].interval).toBe(newInterval);
      // lastRun is reset to 0 when updating cron
      expect(store.snapshotCrons[userId].lastRun).toBe(0);
    });

    it("should remove user snapshot cron", async () => {
      const userId = "user_123";
      mockLocalStorage.data.set("crons", {
        [userId]: {
          userId,
          interval: 24,
          lastRun: Date.now(),
        },
        user_456: {
          userId: "user_456",
          interval: 12,
          lastRun: Date.now(),
        },
      });

      const store = useAppStore();
      await store.loadSnapshotCrons();
      await store.removeUserSnapshotCron(userId);

      expect(store.snapshotCrons[userId]).toBeUndefined();
      expect(store.snapshotCrons["user_456"]).toBeDefined();
      expect(mockLocalStorage.set).toHaveBeenCalled();
    });
  });

  describe("Tracked Users", () => {
    it("should load tracked users", async () => {
      const mockUsersMetadata = {
        user_123: {
          userId: "user_123",
          username: "testuser",
          full_name: "Test User",
          profile_pic_url: "https://example.com/pic.jpg",
          snapshotCount: 5,
          lastSnapshot: Date.now(),
          last_updated: Date.now(),
        },
      };
      mockLocalStorage.data.set("users_metadata", mockUsersMetadata);

      // Mock getAllTrackedUsers to return proper array
      const { getAllTrackedUsers } = await import("../../utils/storage");
      vi.mocked(getAllTrackedUsers).mockResolvedValue([
        mockUsersMetadata.user_123,
      ]);

      const store = useAppStore();
      await store.loadTrackedUsers();

      expect(store.trackedUsersLoaded).toBe(true);
      expect(store.trackedUsers).toHaveLength(1);
      expect(store.trackedUsers[0].userId).toBe("user_123");
    });

    it("should delete tracked user", async () => {
      const userId = "user_123";
      const mockUsersMetadata = {
        [userId]: {
          userId,
          username: "testuser",
          full_name: "Test User",
          profile_pic_url: "https://example.com/pic.jpg",
          snapshotCount: 3,
          lastSnapshot: Date.now(),
          last_updated: Date.now(),
        },
        user_456: {
          userId: "user_456",
          username: "anotheruser",
          full_name: "Another User",
          profile_pic_url: "https://example.com/pic2.jpg",
          snapshotCount: 2,
          lastSnapshot: Date.now(),
          last_updated: Date.now(),
        },
      };

      const trackedUsersArray = Object.values(mockUsersMetadata);
      
      const { getAllTrackedUsers, deleteUserData } = await import("../../utils/storage");
      vi.mocked(getAllTrackedUsers).mockResolvedValue(trackedUsersArray);
      vi.mocked(deleteUserData).mockResolvedValue(undefined);

      const store = useAppStore();
      await store.loadTrackedUsers();

      await store.deleteTrackedUser(userId);

      expect(store.trackedUsers).toHaveLength(1);
      expect(store.trackedUsers[0].userId).toBe("user_456");
      expect(deleteUserData).toHaveBeenCalledWith(userId);
    });
  });

  describe("Getters", () => {
    it("should get cron settings for user", async () => {
      mockLocalStorage.data.set("crons", {
        user_123: {
          userId: "user_123",
          interval: 24,
          lastRun: Date.now(),
        },
        user_456: {
          userId: "user_456",
          interval: 12,
          lastRun: Date.now(),
        },
      });

      const store = useAppStore();
      await store.loadSnapshotCrons();

      expect(store.snapshotCrons["user_123"]).toBeDefined();
      expect(store.snapshotCrons["user_456"]).toBeDefined();
      expect(Object.keys(store.snapshotCrons)).toEqual(["user_123", "user_456"]);
    });

    it("should check if user has cron", async () => {
      mockLocalStorage.data.set("crons", {
        user_123: {
          userId: "user_123",
          interval: 24,
          lastRun: Date.now(),
        },
      });

      const store = useAppStore();
      await store.loadSnapshotCrons();

      expect("user_123" in store.snapshotCrons).toBe(true);
      expect("user_456" in store.snapshotCrons).toBe(false);
    });
  });
});
