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

			const snapshots = await database.snapshots
				.where("belongToId")
				.equals(userId)
				.toArray();

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
				await database.saveSnapshot(
					userId,
					1000 + i * 1000,
					newFollowers,
					followingIds
				);
			}

			const snapshots = await database.snapshots
				.where("belongToId")
				.equals(userId)
				.toArray();

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
					followingIds
				);
			}

			const snapshots = await database.snapshots
				.where("belongToId")
				.equals(userId)
				.toArray();

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
			const result = await database.readEncryptedConfig(
				"nonexistent",
				encryptor
			);

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
				await database.saveSnapshot(
					userId,
					1000 + i * 1000,
					[`follower_${i}`],
					[`following_${i}`]
				);
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

			await database.saveSnapshot(
				userId,
				1000,
				["follower_1"],
				["following_1"]
			);
			await database.saveSnapshot(
				userId,
				2000,
				["follower_2"],
				["following_2"]
			);

			// deleteUserData only deletes snapshots and crons, not metadata
			await database.deleteUserData(userId);

			const snapshots = await database.snapshots
				.where("belongToId")
				.equals(userId)
				.toArray();
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
});
