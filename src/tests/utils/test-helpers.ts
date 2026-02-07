import { createPinia, setActivePinia } from "pinia";
import { vi } from "vitest";

/**
 * Setup Pinia for testing
 */
export function setupTestPinia() {
  const pinia = createPinia();
  setActivePinia(pinia);
  return pinia;
}

/**
 * Create mock Chrome storage data
 */
export function createMockStorage(data: Record<string, any> = {}) {
  const storage = new Map(Object.entries(data));

  return {
    get: vi.fn((keys: string | string[]) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      const result: Record<string, any> = {};
      keysArray.forEach((key) => {
        if (storage.has(key)) {
          result[key] = storage.get(key);
        }
      });
      return Promise.resolve(result);
    }),
    set: vi.fn((items: Record<string, any>) => {
      Object.entries(items).forEach(([key, value]) => {
        storage.set(key, value);
      });
      return Promise.resolve();
    }),
    remove: vi.fn((keys: string | string[]) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach((key) => storage.delete(key));
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      storage.clear();
      return Promise.resolve();
    }),
    data: storage,
  };
}

/**
 * Wait for next tick with custom delay
 */
export async function waitFor(ms: number = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create mock Instagram user node
 */
export function createMockUserNode(
  id: string,
  username: string = `user_${id}`,
  full_name: string = `User ${id}`
) {
  return {
    id,
    username,
    full_name,
    profile_pic_url: `https://example.com/pic_${id}.jpg`,
    is_verified: false,
    is_private: false,
  };
}

/**
 * Create mock snapshot data
 */
export function createMockSnapshot(
  targetId: string,
  followerCount: number = 100,
  followingCount: number = 50
) {
  const followers = Array.from({ length: followerCount }, (_, i) =>
    createMockUserNode(`follower_${i}`)
  );
  const following = Array.from({ length: followingCount }, (_, i) =>
    createMockUserNode(`following_${i}`)
  );

  return {
    targetId,
    timestamp: Date.now(),
    followers,
    following,
  };
}
