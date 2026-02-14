import { describe, it, expect, beforeEach } from "vitest";
import { LRUCache } from "../../utils/lru-cache";

describe("LRUCache", () => {
	let cache: LRUCache<string, number>;

	beforeEach(() => {
		cache = new LRUCache<string, number>(3);
	});

	describe("Basic Operations", () => {
		it("should set and get values", () => {
			cache.set("key1", 100);

			expect(cache.get("key1")).toBe(100);
		});

		it("should return undefined for non-existent keys", () => {
			expect(cache.get("nonexistent")).toBeUndefined();
		});

		it("should check if key exists", () => {
			cache.set("key1", 100);

			expect(cache.has("key1")).toBe(true);
			expect(cache.has("key2")).toBe(false);
		});

		it("should delete keys", () => {
			cache.set("key1", 100);
			cache.delete("key1");

			expect(cache.has("key1")).toBe(false);
			expect(cache.get("key1")).toBeUndefined();
		});

		it("should clear all entries", () => {
			cache.set("key1", 100);
			cache.set("key2", 200);
			cache.clear();

			expect(cache.size).toBe(0);
			expect(cache.has("key1")).toBe(false);
			expect(cache.has("key2")).toBe(false);
		});
	});

	describe("LRU Eviction", () => {
		it("should evict least recently used item when capacity exceeded", () => {
			cache.set("key1", 100);
			cache.set("key2", 200);
			cache.set("key3", 300);
			cache.set("key4", 400); // Should evict key1

			expect(cache.has("key1")).toBe(false);
			expect(cache.has("key2")).toBe(true);
			expect(cache.has("key3")).toBe(true);
			expect(cache.has("key4")).toBe(true);
		});

		it("should update access order on get", () => {
			cache.set("key1", 100);
			cache.set("key2", 200);
			cache.set("key3", 300);

			// Access key1 to make it most recent
			cache.get("key1");

			// Add key4, should evict key2 (least recently used)
			cache.set("key4", 400);

			expect(cache.has("key1")).toBe(true);
			expect(cache.has("key2")).toBe(false);
			expect(cache.has("key3")).toBe(true);
			expect(cache.has("key4")).toBe(true);
		});

		it("should update access order on set of existing key", () => {
			cache.set("key1", 100);
			cache.set("key2", 200);
			cache.set("key3", 300);

			// Update key1
			cache.set("key1", 150);

			// Add key4, should evict key2
			cache.set("key4", 400);

			expect(cache.has("key1")).toBe(true);
			expect(cache.get("key1")).toBe(150);
			expect(cache.has("key2")).toBe(false);
		});
	});

	describe("Size Management", () => {
		it("should track size correctly", () => {
			expect(cache.size).toBe(0);

			cache.set("key1", 100);
			expect(cache.size).toBe(1);

			cache.set("key2", 200);
			expect(cache.size).toBe(2);

			cache.delete("key1");
			expect(cache.size).toBe(1);
		});

		it("should not exceed max size", () => {
			cache.set("key1", 100);
			cache.set("key2", 200);
			cache.set("key3", 300);
			cache.set("key4", 400);
			cache.set("key5", 500);

			expect(cache.size).toBe(3);
		});

		it("should maintain size after clear", () => {
			cache.set("key1", 100);
			cache.set("key2", 200);
			cache.clear();

			expect(cache.size).toBe(0);
		});
	});

	describe("Iterator Methods", () => {
		it("should iterate over keys", () => {
			cache.set("key1", 100);
			cache.set("key2", 200);
			cache.set("key3", 300);

			const keys = Array.from(cache.keys());

			expect(keys).toHaveLength(3);
			expect(keys).toContain("key1");
			expect(keys).toContain("key2");
			expect(keys).toContain("key3");
		});

		it("should return keys in most-to-least recent order", () => {
			cache.set("key1", 100);
			cache.set("key2", 200);
			cache.set("key3", 300);

			const keys = Array.from(cache.keys());

			// Most recent should be last (key3)
			expect(keys[keys.length - 1]).toBe("key3");
		});
	});

	describe("Edge Cases", () => {
		it("should handle cache with size 1", () => {
			const smallCache = new LRUCache<string, number>(1);

			smallCache.set("key1", 100);
			expect(smallCache.get("key1")).toBe(100);

			smallCache.set("key2", 200);
			expect(smallCache.has("key1")).toBe(false);
			expect(smallCache.get("key2")).toBe(200);
		});

		it("should handle updating same key multiple times", () => {
			cache.set("key1", 100);
			cache.set("key1", 200);
			cache.set("key1", 300);

			expect(cache.get("key1")).toBe(300);
			expect(cache.size).toBe(1);
		});

		it("should handle deleting non-existent key", () => {
			const result = cache.delete("nonexistent");

			expect(result).toBe(false);
			expect(cache.size).toBe(0);
		});

		it("should work with different value types", () => {
			const objCache = new LRUCache<string, { value: number }>(2);

			objCache.set("key1", { value: 100 });
			objCache.set("key2", { value: 200 });

			expect(objCache.get("key1")).toEqual({ value: 100 });
			expect(objCache.get("key2")).toEqual({ value: 200 });
		});
	});
});
