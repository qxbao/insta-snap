import { describe, it, expect, beforeEach, vi } from "vitest";
import { database } from "../../utils/database";

// Mock chrome API
const mockChromeStorage = {
  local: {
    get: vi.fn(),
    getKeys: vi.fn(),
    remove: vi.fn(),
  },
};

(global as any).chrome = {
  storage: mockChromeStorage,
};

describe("Migration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should detect when migration is needed", async () => {
    const { needsMigration } = await import("../../utils/migrate");

    // Mock chrome.storage has old data
    mockChromeStorage.local.getKeys.mockResolvedValue([
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

  it("should detect when migration is not needed", async () => {
    const { needsMigration } = await import("../../utils/migrate");

    // Mock chrome.storage has no old data
    mockChromeStorage.local.getKeys.mockResolvedValue(["appId", "csrfToken"]);

    const result = await needsMigration();
    expect(result).toBe(false);
  });

  it("should not migrate if IndexedDB already has data", async () => {
    const { needsMigration } = await import("../../utils/migrate");

    // Mock chrome.storage has old data
    mockChromeStorage.local.getKeys.mockResolvedValue(["meta_123"]);

    // Mock IndexedDB already has data
    vi.spyOn(database.userMetadata, "count").mockResolvedValue(10);
    vi.spyOn(database.snapshots, "count").mockResolvedValue(100);

    const result = await needsMigration();
    expect(result).toBe(false);
  });

  it("should migrate user metadata correctly", async () => {
    const { migrateFromChromeStorage } = await import("../../utils/migrate");

    // Mock user metadata in chrome.storage
    const mockUserMap = {
      "123": {
        username: "testuser",
        full_name: "Test User",
        profile_pic_url: "https://example.com/pic.jpg",
        last_updated: 1234567890,
      },
    };

    mockChromeStorage.local.get.mockImplementation((keys) => {
      if (keys === "users_metadata") {
        return Promise.resolve({ users_metadata: mockUserMap });
      }
      return Promise.resolve({});
    });

    mockChromeStorage.local.getKeys.mockResolvedValue(["users_metadata"]);

    const bulkPutSpy = vi.spyOn(database.userMetadata, "bulkPut").mockResolvedValue(undefined as any);

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
});
