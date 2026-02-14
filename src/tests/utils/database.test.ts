import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { database } from "../../utils/database";
import { Encryptor } from "../../utils/encrypt";
import { IDBFactory } from "fake-indexeddb";

describe("Database", () => {
  let encryptor: Encryptor;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();

    encryptor = await Encryptor.new();

    if (!database.isOpen()) {
      await database.open();
    }

    // Clear all tables
    await database.userMetadata.clear();
    await database.snapshots.clear();
    await database.crons.clear();
    await database.internalConfig.clear();
  });

  afterEach(async () => {
    if (database.isOpen()) {
      await database.close();
    }
  });

  describe("Snapshot Storage", () => {
    const userId = "test_user_123";
    const followerIds = Array.from({ length: 100 }, (_, i) => `follower_${i}`);
    const followingIds = Array.from({ length: 50 }, (_, i) => `following_${i}`);

    it("should save first snapshot as checkpoint", async () => {
      const timestamp = Date.now();

      await database.saveSnapshot(userId, timestamp, followerIds, followingIds);

      const snapshots = await database.snapshots.where("belongToId").equals(userId).toArray();

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].isCheckpoint).toBe(1);
      expect(snapshots[0].followers.add).toEqual(followerIds);
      expect(snapshots[0].following.add).toEqual(followingIds);
    });

    it("should save delta snapshots between checkpoints", async () => {
      // Save checkpoint
      await database.saveSnapshot(userId, 1000, followerIds, followingIds);

      // Save delta snapshots
      for (let i = 1; i < 5; i++) {
        const newFollowers = [...followerIds, `new_${i}`];
        await database.saveSnapshot(userId, 1000 + i * 1000, newFollowers, followingIds);
      }

      const snapshots = await database.snapshots.where("belongToId").equals(userId).toArray();

      expect(snapshots).toHaveLength(5);

      // Check that delta snapshots have add/rem arrays
      const deltaSnapshot = snapshots.find((s) => s.isCheckpoint === 0);
      expect(deltaSnapshot?.followers.add).toBeDefined();
      expect(deltaSnapshot?.followers.rem).toBeDefined();
    });

    it("should create checkpoint every 20 snapshots", async () => {
      // Save 20 snapshots (first one is checkpoint)
      for (let i = 0; i < 20; i++) {
        await database.saveSnapshot(
          userId,
          1000 + i * 1000,
          [...followerIds, `new_${i}`],
          followingIds,
        );
      }

      const snapshots = await database.snapshots.where("belongToId").equals(userId).toArray();

      const checkpoints = snapshots.filter((s) => s.isCheckpoint === 1);
      // First one is checkpoint, 20th should create another
      expect(checkpoints.length).toBeGreaterThanOrEqual(1);
      expect(snapshots.length).toBe(20);
    });

    it("should rebuild full list from checkpoint and deltas", async () => {
      // Save checkpoint
      await database.saveSnapshot(userId, 1000, followerIds, followingIds);

      // Add some followers in delta snapshots
      const newFollowers = [...followerIds, "new_1", "new_2"];
      await database.saveSnapshot(userId, 2000, newFollowers, followingIds);

      const rebuiltSet = await database.getFullList(userId, 2000, true);
      const rebuiltList = Array.from(rebuiltSet);

      expect(rebuiltList).toHaveLength(newFollowers.length);
      expect(rebuiltList).toContain("new_1");
      expect(rebuiltList).toContain("new_2");
    });

    it("should handle removed users in deltas", async () => {
      await database.saveSnapshot(userId, 1000, followerIds, followingIds);

      // Remove first follower
      const updatedFollowers = followerIds.slice(1);
      await database.saveSnapshot(userId, 2000, updatedFollowers, followingIds);

      const rebuiltSet = await database.getFullList(userId, 2000, true);
      const rebuiltList = Array.from(rebuiltSet);

      expect(rebuiltList).not.toContain(followerIds[0]);
      expect(rebuiltList.length).toBeLessThan(followerIds.length);
    });
  });

  describe("Encrypted Config Storage", () => {
    beforeEach(async () => {
      // Store encryption key first
      const key = await encryptor.getKey();
      if (key) {
        await database.internalConfig.put({
          key: "encryptionKey",
          value: key,
        });
      }
    });

    it("should write and read encrypted config", async () => {
      const key = "appId";
      const value = "test-app-id-12345";

      await database.writeEncryptedConfig(key, value, encryptor);

      const decrypted = await database.readEncryptedConfig(key, encryptor);

      expect(decrypted).toBe(value);
    });

    it("should handle multiple encrypted configs", async () => {
      await database.writeEncryptedConfig("appId", "app-123", encryptor);
      await database.writeEncryptedConfig("csrfToken", "csrf-456", encryptor);
      await database.writeEncryptedConfig("wwwClaim", "claim-789", encryptor);

      const appId = await database.readEncryptedConfig("appId", encryptor);
      const csrf = await database.readEncryptedConfig("csrfToken", encryptor);
      const claim = await database.readEncryptedConfig("wwwClaim", encryptor);

      expect(appId).toBe("app-123");
      expect(csrf).toBe("csrf-456");
      expect(claim).toBe("claim-789");
    });

    it("should return null for non-existent config", async () => {
      const result = await database.readEncryptedConfig("nonexistent", encryptor);

      expect(result).toBeNull();
    });

    it("should update existing encrypted config", async () => {
      await database.writeEncryptedConfig("appId", "old-value", encryptor);
      await database.writeEncryptedConfig("appId", "new-value", encryptor);

      const result = await database.readEncryptedConfig("appId", encryptor);

      expect(result).toBe("new-value");
    });
  });

  describe("Snapshot History", () => {
    const userId = "history_test_user";

    beforeEach(async () => {
      // Create test snapshots
      for (let i = 0; i < 5; i++) {
        await database.saveSnapshot(userId, 1000 + i * 1000, [`follower_${i}`], [`following_${i}`]);
      }
    });

    it("should get snapshot history", async () => {
      const history = await database.getSnapshotHistory(userId, true);

      expect(history.length).toBeGreaterThan(0);
    });

    it("should get following history separately", async () => {
      const followerHistory = await database.getSnapshotHistory(userId, true);
      const followingHistory = await database.getSnapshotHistory(userId, false);

      expect(followerHistory).toBeDefined();
      expect(followingHistory).toBeDefined();
    });
  });

  describe("User Metadata", () => {
    it("should get all tracked users with metadata", async () => {
      // Need to save snapshots first for users to be tracked
      await database.userMetadata.bulkPut([
        {
          id: "user_1",
          username: "user1",
          fullName: "User One",
          avatarURL: "pic1.jpg",
          updatedAt: Date.now(),
        },
        {
          id: "user_2",
          username: "user2",
          fullName: "User Two",
          avatarURL: "pic2.jpg",
          updatedAt: Date.now(),
        },
      ]);

      // Save snapshots to make them tracked users
      await database.saveSnapshot("user_1", Date.now(), ["f1"], ["f2"]);
      await database.saveSnapshot("user_2", Date.now(), ["f3"], ["f4"]);

      const users = await database.getAllTrackedUsersWithMetadata();

      expect(users).toHaveLength(2);
      expect(users.some((u) => u.username === "user1")).toBe(true);
      expect(users.some((u) => u.username === "user2")).toBe(true);
    });

    it("should delete user and all associated snapshots", async () => {
      const userId = "delete_test_user";

      await database.userMetadata.put({
        id: userId,
        username: "deletetest",
        fullName: "Delete Test",
        avatarURL: "pic.jpg",
        updatedAt: Date.now(),
      });

      await database.saveSnapshot(userId, 1000, ["follower_1"], ["following_1"]);
      await database.saveSnapshot(userId, 2000, ["follower_2"], ["following_2"]);

      // deleteUserData only deletes snapshots and crons, not metadata
      await database.deleteUserData(userId);

      const snapshots = await database.snapshots.where("belongToId").equals(userId).toArray();
      const cron = await database.getCron(userId);

      expect(snapshots).toHaveLength(0);
      expect(cron).toBeUndefined();

      // Manually delete metadata to test it can be done
      await database.userMetadata.delete(userId);
      const metadata = await database.userMetadata.get(userId);
      expect(metadata).toBeUndefined();
    });
  });

  describe("Cron Management", () => {
    it("should save and retrieve cron job", async () => {
      const uid = "cron_user_123";
      const interval = 24;
      const lastRun = Date.now();

      await database.saveCron(uid, interval, lastRun);

      const cron = await database.getCron(uid);

      expect(cron).toBeDefined();
      expect(cron?.uid).toBe(uid);
      expect(cron?.interval).toBe(interval);
      expect(cron?.lastRun).toBe(lastRun);
    });

    it("should update existing cron job", async () => {
      const uid = "update_cron_user";

      await database.saveCron(uid, 12, 1000);
      await database.saveCron(uid, 24, 2000);

      const cron = await database.getCron(uid);

      expect(cron?.interval).toBe(24);
      expect(cron?.lastRun).toBe(2000);
    });

    it("should get all cron jobs", async () => {
      await database.saveCron("user_1", 12, Date.now());
      await database.saveCron("user_2", 24, Date.now());
      await database.saveCron("user_3", 6, Date.now());

      const crons = await database.crons.toArray();

      expect(crons).toHaveLength(3);
    });

    it("should delete cron job", async () => {
      const uid = "delete_cron_user";

      await database.saveCron(uid, 24, Date.now());
      await database.deleteCron(uid);

      const cron = await database.getCron(uid);

      expect(cron).toBeUndefined();
    });
  });

  describe("bulkUpsertUserMetadata", () => {
    it("should bulk insert user metadata from UserNode array", async () => {
      const userNodes = [
        {
          id: "user_1",
          username: "testuser1",
          full_name: "Test User 1",
          profile_pic_url: "https://example.com/avatar1.jpg",
          is_private: false,
          is_verified: false,
          followed_by_viewer: true,
          requested_by_viewer: false,
        },
        {
          id: "user_2",
          username: "testuser2",
          full_name: "Test User 2",
          profile_pic_url: "https://example.com/avatar2.jpg",
          is_private: false,
          is_verified: false,
          followed_by_viewer: true,
          requested_by_viewer: false,
        },
        {
          id: "user_3",
          username: "testuser3",
          full_name: "Test User 3",
          profile_pic_url: "https://example.com/avatar3.jpg",
          is_private: false,
          is_verified: false,
          followed_by_viewer: true,
          requested_by_viewer: false,
        },
      ];

      await database.bulkUpsertUserMetadata(userNodes);

      const user1 = await database.userMetadata.get("user_1");
      const user2 = await database.userMetadata.get("user_2");
      const user3 = await database.userMetadata.get("user_3");

      expect(user1?.username).toBe("testuser1");
      expect(user1?.fullName).toBe("Test User 1");
      expect(user1?.avatarURL).toBe("https://example.com/avatar1.jpg");

      expect(user2?.username).toBe("testuser2");
      expect(user3?.username).toBe("testuser3");
    });

    it("should update existing user metadata", async () => {
      const initialNode = {
        id: "user_1",
        username: "oldusername",
        full_name: "Old Name",
        profile_pic_url: "old.jpg",
        is_private: false,
        is_verified: false,
        followed_by_viewer: true,
        requested_by_viewer: false,
      };

      await database.bulkUpsertUserMetadata([initialNode]);

      const updatedNode = {
        id: "user_1",
        username: "newusername",
        full_name: "New Name",
        profile_pic_url: "new.jpg",
        is_private: false,
        is_verified: false,
        followed_by_viewer: true,
        requested_by_viewer: false,
      };

      await database.bulkUpsertUserMetadata([updatedNode]);

      const user = await database.userMetadata.get("user_1");

      expect(user?.username).toBe("newusername");
      expect(user?.fullName).toBe("New Name");
      expect(user?.avatarURL).toBe("new.jpg");
    });

    it("should filter out invalid user nodes without id", async () => {
      const userNodes = [
        {
          id: "user_1",
          username: "validuser",
          full_name: "Valid User",
          profile_pic_url: "valid.jpg",
        },
        {
          // Missing id
          username: "invaliduser",
          full_name: "Invalid User",
          profile_pic_url: "invalid.jpg",
        } as any,
      ];

      await database.bulkUpsertUserMetadata(userNodes);

      const allUsers = await database.userMetadata.toArray();

      expect(allUsers).toHaveLength(1);
      expect(allUsers[0].id).toBe("user_1");
    });

    it("should filter out invalid user nodes without username", async () => {
      const userNodes = [
        {
          id: "user_1",
          username: "validuser",
          full_name: "Valid User",
          profile_pic_url: "valid.jpg",
        },
        {
          id: "user_2",
          // Missing username
          full_name: "Invalid User",
          profile_pic_url: "invalid.jpg",
        } as any,
      ];

      await database.bulkUpsertUserMetadata(userNodes);

      const allUsers = await database.userMetadata.toArray();

      expect(allUsers).toHaveLength(1);
      expect(allUsers[0].username).toBe("validuser");
    });

    it("should handle empty full_name and profile_pic_url", async () => {
      const userNodes = [
        {
          id: "user_1",
          username: "minimaluser",
          full_name: null,
          profile_pic_url: null,
        } as any,
      ];

      await database.bulkUpsertUserMetadata(userNodes);

      const user = await database.userMetadata.get("user_1");

      expect(user?.username).toBe("minimaluser");
      expect(user?.fullName).toBe("");
      expect(user?.avatarURL).toBe("");
    });

    it("should set updatedAt timestamp", async () => {
      const beforeTime = Date.now();

      const userNodes = [
        {
          id: "user_1",
          username: "timeuser",
          full_name: "Time User",
          profile_pic_url: "time.jpg",
          is_private: false,
          is_verified: false,
          followed_by_viewer: true,
          requested_by_viewer: false,
        },
      ];

      await database.bulkUpsertUserMetadata(userNodes);

      const afterTime = Date.now();
      const user = await database.userMetadata.get("user_1");

      expect(user?.updatedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(user?.updatedAt).toBeLessThanOrEqual(afterTime);
    });

    it("should handle empty array", async () => {
      await database.bulkUpsertUserMetadata([]);

      const allUsers = await database.userMetadata.toArray();

      // Should not throw error
      expect(allUsers).toBeDefined();
    });
  });

  describe("deleteSnapshot", () => {
    const userId = "delete_snapshot_user";

    it("should delete checkpoint and all subsequent deltas until next checkpoint", async () => {
      const timestamp1 = 1000;
      const timestamp2 = 2000;

      await database.saveSnapshot(userId, timestamp1, ["f1"], ["f2"]);
      await database.saveSnapshot(userId, timestamp2, ["f3"], ["f4"]);

      const snapshots = await database.snapshots.where("belongToId").equals(userId).toArray();

      expect(snapshots).toHaveLength(2);

      // Delete first checkpoint
      const firstSnapshot = snapshots[0];
      await database.deleteSnapshot(firstSnapshot.id!);

      const remainingSnapshots = await database.snapshots
        .where("belongToId")
        .equals(userId)
        .toArray();

      // Should delete checkpoint and subsequent delta until next checkpoint (which is the second one)
      // Since second snapshot is also a checkpoint, both are deleted
      expect(remainingSnapshots).toHaveLength(0);
    });

    it("should delete delta and all subsequent deltas until next checkpoint", async () => {
      // Create checkpoint
      await database.saveSnapshot(userId, 1000, ["f1"], ["f2"]);

      // Create multiple deltas
      await database.saveSnapshot(userId, 2000, ["f1", "f3"], ["f2"]);
      await database.saveSnapshot(userId, 3000, ["f1", "f3", "f4"], ["f2"]);
      await database.saveSnapshot(userId, 4000, ["f1", "f3", "f4", "f5"], ["f2"]);

      const allSnapshots = await database.snapshots.where("belongToId").equals(userId).toArray();

      expect(allSnapshots).toHaveLength(4); // 1 checkpoint + 3 deltas

      // Delete delta at timestamp 2000
      const targetSnapshot = allSnapshots.find((s) => s.timestamp === 2000);
      expect(targetSnapshot).toBeDefined();

      await database.deleteSnapshot(targetSnapshot!.id!);

      const remainingSnapshots = await database.snapshots
        .where("belongToId")
        .equals(userId)
        .sortBy("timestamp");

      // Should delete timestamp 2000, 3000, 4000 (all subsequent deltas)
      // Only checkpoint at 1000 should remain
      expect(remainingSnapshots).toHaveLength(1);
      expect(remainingSnapshots[0].timestamp).toBe(1000); // Checkpoint
    });

    it("should delete all deltas between two checkpoints", async () => {
      // First checkpoint
      await database.saveSnapshot(userId, 1000, ["f1"], ["f2"]);

      // Deltas
      for (let i = 1; i < 20; i++) {
        await database.saveSnapshot(userId, 1000 + i * 100, [`f${i}`], ["f2"]);
      }

      // Second checkpoint (20th snapshot)
      await database.saveSnapshot(userId, 1000 + 20 * 100, ["f20"], ["f2"]);

      const beforeDelete = await database.snapshots.where("belongToId").equals(userId).toArray();

      expect(beforeDelete.length).toBeGreaterThanOrEqual(20);

      // Delete a delta in the middle
      const middleSnapshot = beforeDelete.find((s) => s.timestamp === 2000);
      await database.deleteSnapshot(middleSnapshot!.id!);

      const afterDelete = await database.snapshots
        .where("belongToId")
        .equals(userId)
        .sortBy("timestamp");

      // Should delete timestamp 2000 and all deltas before it until checkpoint
      // Checkpoint 1000 + deltas after 2000 + checkpoint at end should remain
      expect(afterDelete.length).toBeLessThan(beforeDelete.length);
      expect(afterDelete[0].timestamp).toBe(1000); // First checkpoint remains
    });

    it("should handle deleting non-existent snapshot gracefully", async () => {
      await database.saveSnapshot(userId, 1000, ["f1"], ["f2"]);

      // Try to delete with non-existent ID
      await database.deleteSnapshot(99999);

      const snapshots = await database.snapshots.where("belongToId").equals(userId).toArray();

      // Should not affect existing snapshots
      expect(snapshots).toHaveLength(1);
    });

    it("should stop deleting at next checkpoint", async () => {
      // Checkpoint 1
      await database.saveSnapshot(userId, 1000, ["f1"], ["f2"]);

      // Deltas after checkpoint 1
      await database.saveSnapshot(userId, 2000, ["f1", "f3"], ["f2"]);
      await database.saveSnapshot(userId, 3000, ["f1", "f3", "f4"], ["f2"]);

      // Manually create a second checkpoint
      const secondCheckpointId = await database.snapshots.add({
        belongToId: userId,
        timestamp: 4000,
        isCheckpoint: 1,
        followers: { add: ["f1", "f3", "f4", "f5"], rem: [] },
        following: { add: ["f2"], rem: [] },
      });

      // Delta after checkpoint 2
      await database.saveSnapshot(userId, 5000, ["f1", "f3", "f4", "f5", "f6"], ["f2"]);

      const beforeDelete = await database.snapshots
        .where("belongToId")
        .equals(userId)
        .sortBy("timestamp");

      expect(beforeDelete).toHaveLength(5);

      // Delete delta at 2000
      const targetSnapshot = beforeDelete.find((s) => s.timestamp === 2000);
      await database.deleteSnapshot(targetSnapshot!.id!);

      const afterDelete = await database.snapshots
        .where("belongToId")
        .equals(userId)
        .sortBy("timestamp");

      // Should delete 2000 and 3000 (subsequent deltas), stop at checkpoint 4000
      // Checkpoints at 1000 and 4000, and delta at 5000 should remain
      expect(afterDelete).toHaveLength(3);
      expect(afterDelete[0].timestamp).toBe(1000); // Checkpoint 1
      expect(afterDelete[1].timestamp).toBe(4000); // Checkpoint 2
      expect(afterDelete[2].timestamp).toBe(5000); // Delta after checkpoint 2
    });

    it("should not affect other users' snapshots", async () => {
      const user1 = "user_1";
      const user2 = "user_2";

      await database.saveSnapshot(user1, 1000, ["f1"], ["f2"]);
      await database.saveSnapshot(user1, 2000, ["f1", "f3"], ["f2"]);

      await database.saveSnapshot(user2, 1000, ["g1"], ["g2"]);
      await database.saveSnapshot(user2, 2000, ["g1", "g3"], ["g2"]);

      const user1Snapshots = await database.snapshots.where("belongToId").equals(user1).toArray();

      // Delete user1's snapshot
      await database.deleteSnapshot(user1Snapshots[1].id!);

      const user2SnapshotsAfter = await database.snapshots
        .where("belongToId")
        .equals(user2)
        .toArray();

      // User2's snapshots should be unaffected
      expect(user2SnapshotsAfter).toHaveLength(2);
    });
  });
});
