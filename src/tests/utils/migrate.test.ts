import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { database } from "../../utils/database";
import { mockBrowser } from "../setup";

(global as any).browser = mockBrowser

describe("Migration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("needsMigration", () => {
		it("should detect when migration is needed", async () => {
			const { needsMigration } = await import("../../utils/migrate");

			mockBrowser.storage.local.getKeys.mockResolvedValue([
				"meta_123",
				"data_123_1234567890",
				"users_metadata",
			]);

			// Mock IndexedDB is empty
			vi.spyOn(database.userMetadata, "count").mockResolvedValue(0);
			vi.spyOn(database.snapshots, "count").mockResolvedValue(0);

			const result = await needsMigration();
			expect(result).toBe(true);
		});

		it("should detect when migration is not needed - no old data", async () => {
			const { needsMigration } = await import("../../utils/migrate");

			// Mock browser.storage has no old data
			mockBrowser.storage.local.getKeys.mockResolvedValue(["appId", "csrfToken"]);

			const result = await needsMigration();
			expect(result).toBe(false);
		});

		it("should not migrate if IndexedDB already has data", async () => {
			const { needsMigration } = await import("../../utils/migrate");

			// Mock browser.storage has old data
			mockBrowser.storage.local.getKeys.mockResolvedValue(["meta_123"]);

			// Mock IndexedDB already has data
			vi.spyOn(database.userMetadata, "count").mockResolvedValue(10);
			vi.spyOn(database.snapshots, "count").mockResolvedValue(100);

			const result = await needsMigration();
			expect(result).toBe(false);
		});

		it("should return false on error", async () => {
			const { needsMigration } = await import("../../utils/migrate");

			mockBrowser.storage.local.getKeys.mockRejectedValue(
				new Error("Storage error"),
			);

			const result = await needsMigration();
			expect(result).toBe(false);
		});

		it("should detect meta_ prefix in keys", async () => {
			const { needsMigration } = await import("../../utils/migrate");

			mockBrowser.storage.local.getKeys.mockResolvedValue(["meta_456"]);
			vi.spyOn(database.userMetadata, "count").mockResolvedValue(0);
			vi.spyOn(database.snapshots, "count").mockResolvedValue(0);

			const result = await needsMigration();
			expect(result).toBe(true);
		});

		it("should detect data_ prefix in keys", async () => {
			const { needsMigration } = await import("../../utils/migrate");

			mockBrowser.storage.local.getKeys.mockResolvedValue([
				"data_123_1234567890",
			]);
			vi.spyOn(database.userMetadata, "count").mockResolvedValue(0);
			vi.spyOn(database.snapshots, "count").mockResolvedValue(0);

			const result = await needsMigration();
			expect(result).toBe(true);
		});

		it("should detect crons key", async () => {
			const { needsMigration } = await import("../../utils/migrate");

			mockBrowser.storage.local.getKeys.mockResolvedValue(["crons"]);
			vi.spyOn(database.userMetadata, "count").mockResolvedValue(0);
			vi.spyOn(database.snapshots, "count").mockResolvedValue(0);

			const result = await needsMigration();
			expect(result).toBe(true);
		});
	});

	describe("migrateFromChromeStorage", () => {
		it("should migrate user metadata correctly", async () => {
			const { migrateFromChromeStorage } = await import("../../utils/migrate");

			// Mock user metadata in browser.storage
			const mockUserMap = {
				"123": {
					username: "testuser",
					full_name: "Test User",
					profile_pic_url: "https://example.com/pic.jpg",
					last_updated: 1234567890,
				},
			};

			mockBrowser.storage.local.get.mockImplementation((keys) => {
				if (keys === "users_metadata") {
					return Promise.resolve({ users_metadata: mockUserMap });
				}
				if (keys === "crons") {
					return Promise.resolve({});
				}
				return Promise.resolve({});
			});

			mockBrowser.storage.local.getKeys.mockResolvedValue(["users_metadata"]);

			const bulkPutSpy = vi
				.spyOn(database.userMetadata, "bulkPut")
				.mockResolvedValue(undefined as any);

			const stats = await migrateFromChromeStorage();

			expect(stats.usersMetadata).toBe(1);
			expect(bulkPutSpy).toHaveBeenCalledWith([
				{
					id: "123",
					username: "testuser",
					fullName: "Test User",
					avatarURL: "https://example.com/pic.jpg",
					updatedAt: 1234567890,
				},
			]);
		});

		it("should handle empty user metadata", async () => {
			const { migrateFromChromeStorage } = await import("../../utils/migrate");

			mockBrowser.storage.local.get.mockImplementation((keys) => {
				if (keys === "users_metadata") {
					return Promise.resolve({});
				}
				if (keys === "crons") {
					return Promise.resolve({});
				}
				return Promise.resolve({});
			});

			mockBrowser.storage.local.getKeys.mockResolvedValue([]);

			const stats = await migrateFromChromeStorage();

			expect(stats.usersMetadata).toBe(0);
			expect(stats.snapshots).toBe(0);
			expect(stats.crons).toBe(0);
			expect(stats.errors).toEqual([]);
		});

		it("should handle user metadata error gracefully", async () => {
			const { migrateFromChromeStorage } = await import("../../utils/migrate");

			mockBrowser.storage.local.get.mockImplementation((keys) => {
				if (keys === "users_metadata") {
					return Promise.reject(new Error("Storage error"));
				}
				if (keys === "crons") {
					return Promise.resolve({});
				}
				return Promise.resolve({});
			});

			mockBrowser.storage.local.getKeys.mockResolvedValue([]);

			const stats = await migrateFromChromeStorage();

			expect(stats.usersMetadata).toBe(0);
			expect(stats.errors.length).toBeGreaterThan(0);
			expect(stats.errors[0]).toContain("User metadata");
		});

		it("should migrate multiple users", async () => {
			const { migrateFromChromeStorage } = await import("../../utils/migrate");

			const mockUserMap = {
				"123": {
					username: "user1",
					full_name: "User One",
					profile_pic_url: "https://example.com/1.jpg",
					last_updated: 1234567890,
				},
				"456": {
					username: "user2",
					full_name: "User Two",
					profile_pic_url: "https://example.com/2.jpg",
					last_updated: 1234567891,
				},
			};

			mockBrowser.storage.local.get.mockImplementation((keys) => {
				if (keys === "users_metadata") {
					return Promise.resolve({ users_metadata: mockUserMap });
				}
				if (keys === "crons") {
					return Promise.resolve({});
				}
				return Promise.resolve({});
			});

			mockBrowser.storage.local.getKeys.mockResolvedValue(["users_metadata"]);

			const bulkPutSpy = vi
				.spyOn(database.userMetadata, "bulkPut")
				.mockResolvedValue(undefined as any);

			const stats = await migrateFromChromeStorage();

			expect(stats.usersMetadata).toBe(2);
			expect(bulkPutSpy).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({ id: "123", username: "user1" }),
					expect.objectContaining({ id: "456", username: "user2" }),
				]),
			);
		});
	});

	describe("migrateSnapshots", () => {
		it("should migrate user snapshots correctly", async () => {
			const { migrateFromChromeStorage } = await import("../../utils/migrate");

			const mockMeta = {
				logTimeline: [1234567890, 1234567900],
			};

			const mockSnapshot1 = {
				isCheckpoint: true,
				followers: {
					add: ["user1", "user2"],
					rem: [],
				},
				following: {
					add: ["user3"],
					rem: [],
				},
			};

			const mockSnapshot2 = {
				isCheckpoint: false,
				followers: {
					add: ["user4"],
					rem: ["user1"],
				},
				following: {
					add: [],
					rem: ["user3"],
				},
			};

			mockBrowser.storage.local.get.mockImplementation((keys) => {
				if (keys === "users_metadata") {
					return Promise.resolve({});
				}
				if (keys === "crons") {
					return Promise.resolve({});
				}
				if (keys === "meta_123") {
					return Promise.resolve({ meta_123: mockMeta });
				}
				if (Array.isArray(keys)) {
					return Promise.resolve({
						data_123_1234567890: mockSnapshot1,
						data_123_1234567900: mockSnapshot2,
					});
				}
				return Promise.resolve({});
			});

			mockBrowser.storage.local.getKeys.mockResolvedValue(["meta_123"]);

			const addSpy = vi
				.spyOn(database.snapshots, "add")
				.mockResolvedValue(1 as any);

			const stats = await migrateFromChromeStorage();

			expect(stats.snapshots).toBe(2);
			expect(addSpy).toHaveBeenCalledTimes(2);
			expect(addSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					belongToId: "123",
					isCheckpoint: 1,
					timestamp: 1234567890,
				}),
			);
		});

		it("should skip missing meta", async () => {
			const { migrateFromChromeStorage } = await import("../../utils/migrate");

			mockBrowser.storage.local.get.mockImplementation((keys) => {
				if (keys === "users_metadata") {
					return Promise.resolve({});
				}
				if (keys === "crons") {
					return Promise.resolve({});
				}
				if (keys === "meta_123") {
					return Promise.resolve({});
				}
				return Promise.resolve({});
			});

			mockBrowser.storage.local.getKeys.mockResolvedValue(["meta_123"]);

			const stats = await migrateFromChromeStorage();

			expect(stats.snapshots).toBe(0);
		});

		it("should skip missing snapshot records", async () => {
			const { migrateFromChromeStorage } = await import("../../utils/migrate");

			const mockMeta = {
				logTimeline: [1234567890],
			};

			mockBrowser.storage.local.get.mockImplementation((keys) => {
				if (keys === "users_metadata") {
					return Promise.resolve({});
				}
				if (keys === "crons") {
					return Promise.resolve({});
				}
				if (keys === "meta_123") {
					return Promise.resolve({ meta_123: mockMeta });
				}
				if (Array.isArray(keys)) {
					return Promise.resolve({});
				}
				return Promise.resolve({});
			});

			mockBrowser.storage.local.getKeys.mockResolvedValue(["meta_123"]);

			const stats = await migrateFromChromeStorage();

			expect(stats.snapshots).toBe(0);
		});

		it("should handle duplicate snapshot error", async () => {
			const { migrateFromChromeStorage } = await import("../../utils/migrate");

			const mockMeta = {
				logTimeline: [1234567890],
			};

			const mockSnapshot = {
				isCheckpoint: true,
				followers: { add: [], rem: [] },
				following: { add: [], rem: [] },
			};

			mockBrowser.storage.local.get.mockImplementation((keys) => {
				if (keys === "users_metadata") {
					return Promise.resolve({});
				}
				if (keys === "crons") {
					return Promise.resolve({});
				}
				if (keys === "meta_123") {
					return Promise.resolve({ meta_123: mockMeta });
				}
				if (Array.isArray(keys)) {
					return Promise.resolve({
						data_123_1234567890: mockSnapshot,
					});
				}
				return Promise.resolve({});
			});

			mockBrowser.storage.local.getKeys.mockResolvedValue(["meta_123"]);

			const addSpy = vi
				.spyOn(database.snapshots, "add")
				.mockRejectedValue(new Error("Key already exists"));

			const stats = await migrateFromChromeStorage();

			expect(addSpy).toHaveBeenCalled();
			expect(stats.snapshots).toBe(0);
			expect(stats.errors.length).toBe(0); // Should not add error for duplicate
		});

		it("should handle other snapshot errors", async () => {
			const { migrateFromChromeStorage } = await import("../../utils/migrate");

			const mockMeta = {
				logTimeline: [1234567890],
			};

			const mockSnapshot = {
				isCheckpoint: true,
				followers: { add: [], rem: [] },
				following: { add: [], rem: [] },
			};

			mockBrowser.storage.local.get.mockImplementation((keys) => {
				if (keys === "users_metadata") {
					return Promise.resolve({});
				}
				if (keys === "crons") {
					return Promise.resolve({});
				}
				if (keys === "meta_123") {
					return Promise.resolve({ meta_123: mockMeta });
				}
				if (Array.isArray(keys)) {
					return Promise.resolve({
						data_123_1234567890: mockSnapshot,
					});
				}
				return Promise.resolve({});
			});

			mockBrowser.storage.local.getKeys.mockResolvedValue(["meta_123"]);

			const addSpy = vi
				.spyOn(database.snapshots, "add")
				.mockRejectedValue(new Error("Database error"));

			const stats = await migrateFromChromeStorage();

			expect(addSpy).toHaveBeenCalled();
			expect(stats.errors.length).toBeGreaterThan(0);
		});

		it("should handle snapshot with isCheckpoint false", async () => {
			const { migrateFromChromeStorage } = await import("../../utils/migrate");

			const mockMeta = {
				logTimeline: [1234567890],
			};

			const mockSnapshot = {
				isCheckpoint: false,
				followers: { add: ["user1"], rem: [] },
				following: { add: [], rem: [] },
			};

			mockBrowser.storage.local.get.mockImplementation((keys) => {
				if (keys === "users_metadata") {
					return Promise.resolve({});
				}
				if (keys === "crons") {
					return Promise.resolve({});
				}
				if (keys === "meta_123") {
					return Promise.resolve({ meta_123: mockMeta });
				}
				if (Array.isArray(keys)) {
					return Promise.resolve({
						data_123_1234567890: mockSnapshot,
					});
				}
				return Promise.resolve({});
			});

			mockBrowser.storage.local.getKeys.mockResolvedValue(["meta_123"]);

			const addSpy = vi
				.spyOn(database.snapshots, "add")
				.mockResolvedValue(1 as any);

			const stats = await migrateFromChromeStorage();

			expect(stats.snapshots).toBe(1);
			expect(addSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					isCheckpoint: 0,
				}),
			);
		});
	});

	describe("migrateCrons", () => {
		it("should migrate cron jobs correctly", async () => {
			const { migrateFromChromeStorage } = await import("../../utils/migrate");

			const mockCrons = {
				"123": {
					interval: 30,
					lastRun: 1234567890,
				},
			};

			mockBrowser.storage.local.get.mockImplementation((keys) => {
				if (keys === "users_metadata") {
					return Promise.resolve({});
				}
				if (keys === "crons") {
					return Promise.resolve({ crons: mockCrons });
				}
				return Promise.resolve({});
			});

			mockBrowser.storage.local.getKeys.mockResolvedValue([]);

			const putSpy = vi
				.spyOn(database.crons, "put")
				.mockResolvedValue(undefined as any);

			const stats = await migrateFromChromeStorage();

			expect(stats.crons).toBe(1);
			expect(putSpy).toHaveBeenCalledWith({
				uid: "123",
				interval: 30,
				lastRun: 1234567890,
			});
		});

		it("should handle crons with uid field", async () => {
			const { migrateFromChromeStorage } = await import("../../utils/migrate");

			const mockCrons = {
				oldKey: {
					uid: "456",
					interval: 60,
					lastRun: 1234567890,
				},
			};

			mockBrowser.storage.local.get.mockImplementation((keys) => {
				if (keys === "users_metadata") {
					return Promise.resolve({});
				}
				if (keys === "crons") {
					return Promise.resolve({ crons: mockCrons });
				}
				return Promise.resolve({});
			});

			mockBrowser.storage.local.getKeys.mockResolvedValue([]);

			const putSpy = vi
				.spyOn(database.crons, "put")
				.mockResolvedValue(undefined as any);

			const stats = await migrateFromChromeStorage();

			expect(stats.crons).toBe(1);
			expect(putSpy).toHaveBeenCalledWith({
				uid: "456",
				interval: 60,
				lastRun: 1234567890,
			});
		});

		it("should handle crons with userId field", async () => {
			const { migrateFromChromeStorage } = await import("../../utils/migrate");

			const mockCrons = {
				oldKey: {
					userId: "789",
					interval: 90,
					lastRun: 1234567890,
				},
			};

			mockBrowser.storage.local.get.mockImplementation((keys) => {
				if (keys === "users_metadata") {
					return Promise.resolve({});
				}
				if (keys === "crons") {
					return Promise.resolve({ crons: mockCrons });
				}
				return Promise.resolve({});
			});

			mockBrowser.storage.local.getKeys.mockResolvedValue([]);

			const putSpy = vi
				.spyOn(database.crons, "put")
				.mockResolvedValue(undefined as any);

			const stats = await migrateFromChromeStorage();

			expect(stats.crons).toBe(1);
			expect(putSpy).toHaveBeenCalledWith({
				uid: "789",
				interval: 90,
				lastRun: 1234567890,
			});
		});

		it("should handle empty crons", async () => {
			const { migrateFromChromeStorage } = await import("../../utils/migrate");

			mockBrowser.storage.local.get.mockImplementation((keys) => {
				if (keys === "users_metadata") {
					return Promise.resolve({});
				}
				if (keys === "crons") {
					return Promise.resolve({});
				}
				return Promise.resolve({});
			});

			mockBrowser.storage.local.getKeys.mockResolvedValue([]);

			const stats = await migrateFromChromeStorage();

			expect(stats.crons).toBe(0);
		});

		it("should handle cron migration error", async () => {
			const { migrateFromChromeStorage } = await import("../../utils/migrate");

			const mockCrons = {
				"123": {
					interval: 30,
					lastRun: 1234567890,
				},
			};

			mockBrowser.storage.local.get.mockImplementation((keys) => {
				if (keys === "users_metadata") {
					return Promise.resolve({});
				}
				if (keys === "crons") {
					return Promise.resolve({ crons: mockCrons });
				}
				return Promise.resolve({});
			});

			mockBrowser.storage.local.getKeys.mockResolvedValue([]);

			vi.spyOn(database.crons, "put").mockRejectedValue(
				new Error("Database error"),
			);

			const stats = await migrateFromChromeStorage();

			expect(stats.crons).toBe(0);
			expect(stats.errors.length).toBeGreaterThan(0);
			expect(stats.errors[0]).toContain("Cron");
		});

		it("should handle multiple crons", async () => {
			const { migrateFromChromeStorage } = await import("../../utils/migrate");

			const mockCrons = {
				"123": { interval: 30, lastRun: 1234567890 },
				"456": { interval: 60, lastRun: 1234567891 },
			};

			mockBrowser.storage.local.get.mockImplementation((keys) => {
				if (keys === "users_metadata") {
					return Promise.resolve({});
				}
				if (keys === "crons") {
					return Promise.resolve({ crons: mockCrons });
				}
				return Promise.resolve({});
			});

			mockBrowser.storage.local.getKeys.mockResolvedValue([]);

			const putSpy = vi
				.spyOn(database.crons, "put")
				.mockResolvedValue(undefined as any);

			const stats = await migrateFromChromeStorage();

			expect(stats.crons).toBe(2);
			expect(putSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe("cleanupOldStorage", () => {
		it("should remove old storage keys", async () => {
			const { cleanupOldStorage } = await import("../../utils/migrate");

			mockBrowser.storage.local.getKeys.mockResolvedValue([
				"meta_123",
				"data_123_1234567890",
				"users_metadata",
				"crons",
				"appId",
				"csrfToken",
			]);

			await cleanupOldStorage();

			expect(mockBrowser.storage.local.remove).toHaveBeenCalledWith([
				"meta_123",
				"data_123_1234567890",
				"users_metadata",
				"crons",
			]);
		});

		it("should handle no keys to remove", async () => {
			const { cleanupOldStorage } = await import("../../utils/migrate");

			mockBrowser.storage.local.getKeys.mockResolvedValue([
				"appId",
				"csrfToken",
			]);

			await cleanupOldStorage();

			expect(mockBrowser.storage.local.remove).not.toHaveBeenCalled();
		});

		it("should throw error on cleanup failure", async () => {
			const { cleanupOldStorage } = await import("../../utils/migrate");

			mockBrowser.storage.local.getKeys.mockRejectedValue(
				new Error("Storage error"),
			);

			await expect(cleanupOldStorage()).rejects.toThrow("Storage error");
		});
	});

	describe("runMigrationWithCleanup", () => {
		it("should run full migration and cleanup on success", async () => {
			const { runMigrationWithCleanup } = await import("../../utils/migrate");

			mockBrowser.storage.local.getKeys.mockResolvedValue(["users_metadata"]);
			vi.spyOn(database.userMetadata, "count").mockResolvedValue(0);
			vi.spyOn(database.snapshots, "count").mockResolvedValue(0);

			mockBrowser.storage.local.get.mockImplementation((keys) => {
				if (keys === "users_metadata") {
					return Promise.resolve({
						users_metadata: {
							"123": {
								username: "test",
								full_name: "Test",
								profile_pic_url: "url",
								last_updated: 123,
							},
						},
					});
				}
				if (keys === "crons") {
					return Promise.resolve({});
				}
				return Promise.resolve({});
			});

			vi.spyOn(database.userMetadata, "bulkPut").mockResolvedValue(
				undefined as any,
			);

			const stats = await runMigrationWithCleanup();

			expect(stats.usersMetadata).toBe(1);
			expect(stats.errors).toEqual([]);
			expect(mockBrowser.storage.local.remove).toHaveBeenCalled();
		});

		it("should not cleanup on migration errors", async () => {
			const { runMigrationWithCleanup } = await import("../../utils/migrate");

			mockBrowser.storage.local.getKeys.mockResolvedValue(["users_metadata"]);
			vi.spyOn(database.userMetadata, "count").mockResolvedValue(0);
			vi.spyOn(database.snapshots, "count").mockResolvedValue(0);

			mockBrowser.storage.local.get.mockImplementation((keys) => {
				if (keys === "users_metadata") {
					return Promise.reject(new Error("Migration error"));
				}
				if (keys === "crons") {
					return Promise.resolve({});
				}
				return Promise.resolve({});
			});

			const stats = await runMigrationWithCleanup();

			expect(stats.errors.length).toBeGreaterThan(0);
			expect(mockBrowser.storage.local.remove).not.toHaveBeenCalled();
		});

		it("should return empty stats when no migration needed", async () => {
			const { runMigrationWithCleanup } = await import("../../utils/migrate");

			mockBrowser.storage.local.getKeys.mockResolvedValue([]);

			const stats = await runMigrationWithCleanup();

			expect(stats.usersMetadata).toBe(0);
			expect(stats.snapshots).toBe(0);
			expect(stats.crons).toBe(0);
			expect(stats.errors).toEqual([]);
		});
	});
});
