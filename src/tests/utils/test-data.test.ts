import { describe, it, expect } from "vitest";
import { createMockUserNode, createMockSnapshot } from "../utils/test-helpers";

describe("Instagram Data Helpers", () => {
  describe("Node Structure", () => {
    it("should create valid user node", () => {
      const node = createMockUserNode("123", "testuser", "Test User");

      expect(node).toHaveProperty("id", "123");
      expect(node).toHaveProperty("username", "testuser");
      expect(node).toHaveProperty("full_name", "Test User");
      expect(node).toHaveProperty("profile_pic_url");
      expect(node).toHaveProperty("is_verified");
      expect(node).toHaveProperty("is_private");
    });

    it("should generate default values", () => {
      const node = createMockUserNode("456");

      expect(node.username).toBe("user_456");
      expect(node.full_name).toBe("User 456");
      expect(node.is_verified).toBe(false);
      expect(node.is_private).toBe(false);
    });
  });

  describe("Snapshot Structure", () => {
    it("should create valid snapshot with followers and following", () => {
      const snapshot = createMockSnapshot("target_123", 50, 30);

      expect(snapshot.targetId).toBe("target_123");
      expect(snapshot.timestamp).toBeLessThanOrEqual(Date.now());
      expect(snapshot.followers).toHaveLength(50);
      expect(snapshot.following).toHaveLength(30);
    });

    it("should create unique user IDs", () => {
      const snapshot = createMockSnapshot("target_123", 10, 5);

      const followerIds = snapshot.followers.map((f) => f.id);
      const followingIds = snapshot.following.map((f) => f.id);

      // Check all IDs are unique
      expect(new Set(followerIds).size).toBe(10);
      expect(new Set(followingIds).size).toBe(5);
    });

    it("should handle zero counts", () => {
      const snapshot = createMockSnapshot("target_123", 0, 0);

      expect(snapshot.followers).toHaveLength(0);
      expect(snapshot.following).toHaveLength(0);
    });

    it("should handle large counts efficiently", () => {
      const snapshot = createMockSnapshot("target_123", 1000, 500);

      expect(snapshot.followers).toHaveLength(1000);
      expect(snapshot.following).toHaveLength(500);
    });
  });

  describe("Data Consistency", () => {
    it("should maintain proper data types", () => {
      const node = createMockUserNode("123");

      expect(typeof node.id).toBe("string");
      expect(typeof node.username).toBe("string");
      expect(typeof node.full_name).toBe("string");
      expect(typeof node.profile_pic_url).toBe("string");
      expect(typeof node.is_verified).toBe("boolean");
      expect(typeof node.is_private).toBe("boolean");
    });

    it("should generate valid URLs", () => {
      const node = createMockUserNode("123");

      expect(node.profile_pic_url).toMatch(/^https?:\/\//);
    });
  });
});
