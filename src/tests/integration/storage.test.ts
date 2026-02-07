import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockStorage, createMockUserNode } from "../utils/test-helpers";

// Import storage functions - adjust based on actual exports
// For now, we'll test the storage pattern

describe("Storage Utils Integration", () => {
  let mockLocalStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockLocalStorage = createMockStorage();
    global.chrome.storage.local.get = mockLocalStorage.get as any;
    global.chrome.storage.local.set = mockLocalStorage.set as any;
    global.chrome.storage.local.remove = mockLocalStorage.remove as any;
  });

  describe("User Metadata Storage", () => {
    it("should save and retrieve user metadata", async () => {
      const userId = "12345";
      const userMetadata = {
        userId,
        username: "testuser",
        full_name: "Test User",
        profile_pic_url: "https://example.com/pic.jpg",
        snapshotCount: 0,
        lastSnapshot: null,
        last_updated: Date.now(),
      };

      await chrome.storage.local.set({
        users_metadata: {
          [userId]: userMetadata,
        },
      });

      const result = await chrome.storage.local.get("users_metadata");
      expect((result.users_metadata as any)[userId]).toEqual(userMetadata);
    });

    it("should update existing user metadata", async () => {
      const userId = "12345";
      const initialMetadata = {
        userId,
        username: "testuser",
        full_name: "Test User",
        profile_pic_url: "https://example.com/pic.jpg",
        snapshotCount: 5,
        lastSnapshot: Date.now() - 86400000,
        last_updated: Date.now() - 86400000,
      };

      await chrome.storage.local.set({
        users_metadata: {
          [userId]: initialMetadata,
        },
      });

      const updatedMetadata = {
        ...initialMetadata,
        snapshotCount: 6,
        lastSnapshot: Date.now(),
        last_updated: Date.now(),
      };

      const existing = await chrome.storage.local.get("users_metadata");
      const users = (existing.users_metadata as any) || {};
      users[userId] = updatedMetadata;
      await chrome.storage.local.set({ users_metadata: users });

      // Verify update
      const result = await chrome.storage.local.get("users_metadata");
      expect((result.users_metadata as any)[userId].snapshotCount).toBe(6);
    });
  });

  describe("Snapshot Storage", () => {
    it("should store checkpoint snapshot", async () => {
      const userId = "12345";
      const timestamp = Date.now();
      const followers = Array.from({ length: 5 }, (_, i) =>
        createMockUserNode(`follower_${i}`)
      );
      const following = Array.from({ length: 3 }, (_, i) =>
        createMockUserNode(`following_${i}`)
      );

      const snapshotKey = `snapshot_${userId}_${timestamp}`;
      const snapshotData = {
        timestamp,
        isCheckpoint: true,
        followers: followers.map((f) => f.id),
        following: following.map((f) => f.id),
      };

      await chrome.storage.local.set({
        [snapshotKey]: snapshotData,
      });

      const result = await chrome.storage.local.get(snapshotKey);
      expect(result[snapshotKey]).toEqual(snapshotData);
    });

    it("should store delta snapshot", async () => {
      const userId = "12345";
      const timestamp = Date.now();

      const snapshotKey = `snapshot_${userId}_${timestamp}`;
      const deltaData = {
        timestamp,
        isCheckpoint: false,
        added: ["new_follower_1", "new_follower_2"],
        removed: ["old_follower_1"],
      };

      await chrome.storage.local.set({
        [snapshotKey]: deltaData,
      });

      const result = await chrome.storage.local.get(snapshotKey);
      expect(result[snapshotKey]).toEqual(deltaData);
      expect((result[snapshotKey] as any).isCheckpoint).toBe(false);
    });
  });

  describe("Cron Storage", () => {
    it("should save and retrieve cron settings", async () => {
      const crons = {
        user_123: {
          userId: "user_123",
          interval: 24,
          lastRun: Date.now(),
        },
        user_456: {
          userId: "user_456",
          interval: 48,
          lastRun: Date.now() - 3600000,
        },
      };

      await chrome.storage.local.set({ crons });

      const result = await chrome.storage.local.get("crons");
      expect((result.crons as any)).toEqual(crons);
    });

    it("should update cron interval", async () => {
      const userId = "user_123";
      const initialCron = {
        userId,
        interval: 24,
        lastRun: Date.now() - 86400000,
      };

      await chrome.storage.local.set({
        crons: {
          [userId]: initialCron,
        },
      });

      // Update interval
      const existing = await chrome.storage.local.get("crons");
      const crons = (existing.crons as any) || {};
      crons[userId] = {
        ...crons[userId],
        interval: 48,
      };
      await chrome.storage.local.set({ crons });

      const result = await chrome.storage.local.get("crons");
      expect((result.crons as any)[userId].interval).toBe(48);
      expect((result.crons as any)[userId].lastRun).toBe(initialCron.lastRun);
    });

    it("should delete cron setting", async () => {
      const crons = {
        user_123: {
          userId: "user_123",
          interval: 24,
          lastRun: Date.now(),
        },
        user_456: {
          userId: "user_456",
          interval: 48,
          lastRun: Date.now(),
        },
      };

      await chrome.storage.local.set({ crons });

      // Remove one cron
      const existing = await chrome.storage.local.get("crons");
      const updatedCrons = { ...(existing.crons as any) };
      delete updatedCrons.user_123;
      await chrome.storage.local.set({ crons: updatedCrons });

      const result = await chrome.storage.local.get("crons");
      expect((result.crons as any).user_123).toBeUndefined();
      expect((result.crons as any).user_456).toBeDefined();
    });
  });

  describe("Batch Operations", () => {
    it("should handle multiple storage operations", async () => {
      const userId = "12345";
      const timestamp = Date.now();

      // Batch write
      await chrome.storage.local.set({
        users_metadata: {
          [userId]: {
            userId,
            username: "testuser",
            full_name: "Test User",
            profile_pic_url: "https://example.com/pic.jpg",
            snapshotCount: 1,
            lastSnapshot: timestamp,
            last_updated: timestamp,
          },
        },
        [`snapshot_${userId}_${timestamp}`]: {
          timestamp,
          isCheckpoint: true,
          followers: ["f1", "f2"],
          following: ["f3"],
        },
      });

      // Batch read
      const result = await chrome.storage.local.get([
        "users_metadata",
        `snapshot_${userId}_${timestamp}`,
      ]);

      expect((result.users_metadata as any)[userId]).toBeDefined();
      expect((result as any)[`snapshot_${userId}_${timestamp}`]).toBeDefined();
    });
  });
});
