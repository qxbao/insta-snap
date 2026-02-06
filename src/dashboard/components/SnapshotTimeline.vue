<script setup lang="ts">
import { ref } from "vue";
import Fa6SolidChevronDown from "~icons/fa6-solid/chevron-down";
import Fa6SolidChevronRight from "~icons/fa6-solid/chevron-right";
import { GlobalUserMap } from "../../types/storage";

interface TimelineEntry {
  timestamp: number;
  isCheckpoint: boolean;
  followers: {
    addedCount: number;
    removedCount: number;
    totalCount?: number;
  };
  following: {
    addedCount: number;
    removedCount: number;
    totalCount?: number;
  };
}

interface Props {
  entries: TimelineEntry[];
  userId: string;
}

const props = defineProps<Props>();

const expandedItems = ref<Set<number>>(new Set());
const snapshotDetails = ref<
  Map<
    number,
    {
      followers: { added: string[]; removed: string[] };
      following: { added: string[]; removed: string[] };
      userMap: GlobalUserMap;
    }
  >
>(new Map());
const loadingDetails = ref<Set<number>>(new Set());

// Track visible counts for pagination (10 users per page)
const visibleCounts = ref<Map<string, number>>(new Map());
const USERS_PER_PAGE = 10;

const getVisibleCount = (timestamp: number, section: string) => {
  const key = `${timestamp}-${section}`;
  return visibleCounts.value.get(key) || USERS_PER_PAGE;
};

const loadMore = (timestamp: number, section: string) => {
  const key = `${timestamp}-${section}`;
  const current = visibleCounts.value.get(key) || USERS_PER_PAGE;
  visibleCounts.value.set(key, current + USERS_PER_PAGE);
};

const loadAll = (timestamp: number, section: string, total: number) => {
  const key = `${timestamp}-${section}`;
  visibleCounts.value.set(key, total);
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

const formatRelativeTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const toggleExpand = async (timestamp: number) => {
  if (expandedItems.value.has(timestamp)) {
    expandedItems.value.delete(timestamp);
  } else {
    expandedItems.value.add(timestamp);

    // Load details if not already loaded
    if (!snapshotDetails.value.has(timestamp)) {
      await loadSnapshotDetails(timestamp);
    }
  }
};

const loadSnapshotDetails = async (timestamp: number) => {
  loadingDetails.value.add(timestamp);

  try {
    const { getSnapshotRecord, getGlobalUserMap } =
      await import("../../utils/storage");
    const record = await getSnapshotRecord(props.userId, timestamp);
    const userMap = await getGlobalUserMap();

    if (record) {
      snapshotDetails.value.set(timestamp, {
        followers: {
          added: record.followers.add || [],
          removed: record.followers.rem || [],
        },
        following: {
          added: record.following.add || [],
          removed: record.following.rem || [],
        },
        userMap,
      });
    }
  } catch (err) {
    console.error("Failed to load snapshot details:", err);
  } finally {
    loadingDetails.value.delete(timestamp);
  }
};

const getUserInfo = (
  userId: string,
  userMap: GlobalUserMap,
) => {
  return (
    userMap[userId] || { username: userId, full_name: "", profile_pic_url: "" }
  );
};
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
      Snapshot timeline
    </h3>
    <div class="space-y-2">
      <div
        v-for="entry in entries"
        :key="entry.timestamp"
        class="border-2 border-lighter/40 rounded-lg overflow-hidden"
      >
        <div
          class="flex items-center justify-between p-4 cursor-pointer hover:bg-lighter/5 transition-colors"
          @click="toggleExpand(entry.timestamp)"
        >
          <div class="flex items-center gap-4 flex-1">
            <button
              class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <Fa6SolidChevronDown
                v-if="expandedItems.has(entry.timestamp)"
                class="w-4 h-4"
              />
              <Fa6SolidChevronRight v-else class="w-4 h-4" />
            </button>
            <div
              :class="[
                'w-3 h-3 rounded-full',
                entry.isCheckpoint ? 'bg-blue-500' : 'bg-gray-400',
              ]"
            ></div>
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ entry.isCheckpoint ? "Checkpoint" : "Delta" }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ formatDate(entry.timestamp) }}
                <span class="text-gray-500">
                  ({{ formatRelativeTime(entry.timestamp) }})
                </span>
              </p>
            </div>
          </div>
          <div class="text-right">
            <p
              v-if="entry.isCheckpoint"
              class="text-sm text-gray-600 dark:text-gray-400"
            >
              Total:
              <span class="font-semibold">{{
                entry.followers.totalCount || 0
              }}</span>
              /
              <span class="font-semibold">{{
                entry.following.totalCount || 0
              }}</span>
            </p>
            <p v-else class="text-sm">
              <span class="text-green-600 dark:text-green-400"
                >+{{ entry.followers.addedCount }}</span
              >
              <span class="text-red-600 dark:text-red-400"
                >-{{ entry.followers.removedCount }}</span
              >
              /
              <span class="text-green-600 dark:text-green-400"
                >+{{ entry.following.addedCount }}</span
              >
              <span class="text-red-600 dark:text-red-400"
                >-{{ entry.following.removedCount }}</span
              >
            </p>
          </div>
        </div>
        <div
          v-if="expandedItems.has(entry.timestamp)"
          class="border-t border-gray-200 dark:border-gray-600 p-4"
        >
          <div
            v-if="loadingDetails.has(entry.timestamp)"
            class="text-center py-4"
          >
            <div
              class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"
            ></div>
          </div>

          <div
            v-else-if="snapshotDetails.has(entry.timestamp)"
            class="space-y-4"
          >
            <div
              v-if="
                snapshotDetails.get(entry.timestamp)!.followers.added.length > 0
              "
            >
              <h4
                class="text-sm font-semibold text-green-600 dark:text-green-400 mb-2"
              >
                Followers Added ({{
                  snapshotDetails.get(entry.timestamp)!.followers.added.length
                }})
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div
                  v-for="userId in snapshotDetails
                    .get(entry.timestamp)!
                    .followers.added.slice(
                      0,
                      getVisibleCount(entry.timestamp, 'followers-added'),
                    )"
                  :key="userId"
                  class="flex items-center gap-2 p-2 bg-lighter/20 rounded"
                >
                  <img
                    :src="
                      getUserInfo(
                        userId,
                        snapshotDetails.get(entry.timestamp)!.userMap,
                      ).profile_pic_url || '/images/user_avatar.png'
                    "
                    :alt="
                      getUserInfo(
                        userId,
                        snapshotDetails.get(entry.timestamp)!.userMap,
                      ).username
                    "
                    referrerpolicy="no-referrer"
                    class="w-8 h-8 rounded-full object-cover"
                    @error="
                      (e) =>
                        ((e.target as HTMLImageElement).src =
                          '/images/user_avatar.png')
                    "
                  />
                  <div class="min-w-0 flex-1">
                    <p
                      class="text-sm font-medium text-gray-900 dark:text-white truncate"
                    >
                      {{
                        getUserInfo(
                          userId,
                          snapshotDetails.get(entry.timestamp)!.userMap,
                        ).full_name ||
                        getUserInfo(
                          userId,
                          snapshotDetails.get(entry.timestamp)!.userMap,
                        ).username
                      }}
                    </p>
                    <p
                      class="text-xs text-gray-500 dark:text-gray-400 truncate"
                    >
                      @{{
                        getUserInfo(
                          userId,
                          snapshotDetails.get(entry.timestamp)!.userMap,
                        ).username
                      }}
                    </p>
                  </div>
                </div>
              </div>
              <div
                v-if="
                  getVisibleCount(entry.timestamp, 'followers-added') <
                  snapshotDetails.get(entry.timestamp)!.followers.added.length
                "
                class="flex gap-2 mt-2"
              >
                <button
                  @click="loadMore(entry.timestamp, 'followers-added')"
                  class="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Load more
                </button>
                <span class="text-gray-400">•</span>
                <button
                  @click="
                    loadAll(
                      entry.timestamp,
                      'followers-added',
                      snapshotDetails.get(entry.timestamp)!.followers.added
                        .length,
                    )
                  "
                  class="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Load all
                </button>
              </div>
            </div>

            <div
              v-if="
                snapshotDetails.get(entry.timestamp)!.followers.removed.length >
                0
              "
            >
              <h4
                class="text-sm font-semibold text-red-600 dark:text-red-400 mb-2"
              >
                Followers Removed ({{
                  snapshotDetails.get(entry.timestamp)!.followers.removed
                    .length
                }})
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div
                  v-for="userId in snapshotDetails
                    .get(entry.timestamp)!
                    .followers.removed.slice(
                      0,
                      getVisibleCount(entry.timestamp, 'followers-removed'),
                    )"
                  :key="userId"
                  class="flex items-center gap-2 p-2 bg-lighter/20 rounded"
                >
                  <img
                    :src="
                      getUserInfo(
                        userId,
                        snapshotDetails.get(entry.timestamp)!.userMap,
                      ).profile_pic_url || '/images/user_avatar.png'
                    "
                    :alt="
                      getUserInfo(
                        userId,
                        snapshotDetails.get(entry.timestamp)!.userMap,
                      ).username
                    "
                    referrerpolicy="no-referrer"
                    class="w-8 h-8 rounded-full object-cover"
                    @error="
                      (e) =>
                        ((e.target as HTMLImageElement).src =
                          '/images/user_avatar.png')
                    "
                  />
                  <div class="min-w-0 flex-1">
                    <p
                      class="text-sm font-medium text-gray-900 dark:text-white truncate"
                    >
                      {{
                        getUserInfo(
                          userId,
                          snapshotDetails.get(entry.timestamp)!.userMap,
                        ).full_name ||
                        getUserInfo(
                          userId,
                          snapshotDetails.get(entry.timestamp)!.userMap,
                        ).username
                      }}
                    </p>
                    <p
                      class="text-xs text-gray-500 dark:text-gray-400 truncate"
                    >
                      @{{
                        getUserInfo(
                          userId,
                          snapshotDetails.get(entry.timestamp)!.userMap,
                        ).username
                      }}
                    </p>
                  </div>
                </div>
              </div>
              <div
                v-if="
                  getVisibleCount(entry.timestamp, 'followers-removed') <
                  snapshotDetails.get(entry.timestamp)!.followers.removed.length
                "
                class="flex gap-2 mt-2"
              >
                <button
                  @click="loadMore(entry.timestamp, 'followers-removed')"
                  class="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Load more
                </button>
                <span class="text-gray-400">•</span>
                <button
                  @click="
                    loadAll(
                      entry.timestamp,
                      'followers-removed',
                      snapshotDetails.get(entry.timestamp)!.followers.removed
                        .length,
                    )
                  "
                  class="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Load all
                </button>
              </div>
            </div>

            <div
              v-if="
                snapshotDetails.get(entry.timestamp)!.following.added.length > 0
              "
            >
              <h4
                class="text-sm font-semibold text-green-600 dark:text-green-400 mb-2"
              >
                Following Added ({{
                  snapshotDetails.get(entry.timestamp)!.following.added.length
                }})
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div
                  v-for="userId in snapshotDetails
                    .get(entry.timestamp)!
                    .following.added.slice(
                      0,
                      getVisibleCount(entry.timestamp, 'following-added'),
                    )"
                  :key="userId"
                  class="flex items-center gap-2 p-2 bg-lighter/20 rounded"
                >
                  <img
                    :src="
                      getUserInfo(
                        userId,
                        snapshotDetails.get(entry.timestamp)!.userMap,
                      ).profile_pic_url || '/images/user_avatar.png'
                    "
                    :alt="
                      getUserInfo(
                        userId,
                        snapshotDetails.get(entry.timestamp)!.userMap,
                      ).username
                    "
                    referrerpolicy="no-referrer"
                    class="w-8 h-8 rounded-full object-cover"
                    @error="
                      (e) =>
                        ((e.target as HTMLImageElement).src =
                          '/images/user_avatar.png')
                    "
                  />
                  <div class="min-w-0 flex-1">
                    <p
                      class="text-sm font-medium text-gray-900 dark:text-white truncate"
                    >
                      {{
                        getUserInfo(
                          userId,
                          snapshotDetails.get(entry.timestamp)!.userMap,
                        ).full_name ||
                        getUserInfo(
                          userId,
                          snapshotDetails.get(entry.timestamp)!.userMap,
                        ).username
                      }}
                    </p>
                    <p
                      class="text-xs text-gray-500 dark:text-gray-400 truncate"
                    >
                      @{{
                        getUserInfo(
                          userId,
                          snapshotDetails.get(entry.timestamp)!.userMap,
                        ).username
                      }}
                    </p>
                  </div>
                </div>
              </div>
              <div
                v-if="
                  getVisibleCount(entry.timestamp, 'following-added') <
                  snapshotDetails.get(entry.timestamp)!.following.added.length
                "
                class="flex gap-2 mt-2"
              >
                <button
                  @click="loadMore(entry.timestamp, 'following-added')"
                  class="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Load more
                </button>
                <span class="text-gray-400">•</span>
                <button
                  @click="
                    loadAll(
                      entry.timestamp,
                      'following-added',
                      snapshotDetails.get(entry.timestamp)!.following.added
                        .length,
                    )
                  "
                  class="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Load all
                </button>
              </div>
            </div>

            <div
              v-if="
                snapshotDetails.get(entry.timestamp)!.following.removed.length >
                0
              "
            >
              <h4
                class="text-sm font-semibold text-red-600 dark:text-red-400 mb-2"
              >
                Following Removed ({{
                  snapshotDetails.get(entry.timestamp)!.following.removed
                    .length
                }})
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div
                  v-for="userId in snapshotDetails
                    .get(entry.timestamp)!
                    .following.removed.slice(
                      0,
                      getVisibleCount(entry.timestamp, 'following-removed'),
                    )"
                  :key="userId"
                  class="flex items-center gap-2 p-2 bg-lighter/20 rounded"
                >
                  <img
                    :src="
                      getUserInfo(
                        userId,
                        snapshotDetails.get(entry.timestamp)!.userMap,
                      ).profile_pic_url || '/images/user_avatar.png'
                    "
                    :alt="
                      getUserInfo(
                        userId,
                        snapshotDetails.get(entry.timestamp)!.userMap,
                      ).username
                    "
                    referrerpolicy="no-referrer"
                    class="w-8 h-8 rounded-full object-cover"
                    @error="
                      (e) =>
                        ((e.target as HTMLImageElement).src =
                          '/images/user_avatar.png')
                    "
                  />
                  <div class="min-w-0 flex-1">
                    <p
                      class="text-sm font-medium text-gray-900 dark:text-white truncate"
                    >
                      {{
                        getUserInfo(
                          userId,
                          snapshotDetails.get(entry.timestamp)!.userMap,
                        ).full_name ||
                        getUserInfo(
                          userId,
                          snapshotDetails.get(entry.timestamp)!.userMap,
                        ).username
                      }}
                    </p>
                    <p
                      class="text-xs text-gray-500 dark:text-gray-400 truncate"
                    >
                      @{{
                        getUserInfo(
                          userId,
                          snapshotDetails.get(entry.timestamp)!.userMap,
                        ).username
                      }}
                    </p>
                  </div>
                </div>
              </div>
              <div
                v-if="
                  getVisibleCount(entry.timestamp, 'following-removed') <
                  snapshotDetails.get(entry.timestamp)!.following.removed.length
                "
                class="flex gap-2 mt-2"
              >
                <button
                  @click="loadMore(entry.timestamp, 'following-removed')"
                  class="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Load more
                </button>
                <span class="text-gray-400">•</span>
                <button
                  @click="
                    loadAll(
                      entry.timestamp,
                      'following-removed',
                      snapshotDetails.get(entry.timestamp)!.following.removed
                        .length,
                    )
                  "
                  class="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Load all
                </button>
              </div>
            </div>

            <div
              v-if="
                snapshotDetails.get(entry.timestamp)!.followers.added.length ===
                  0 &&
                snapshotDetails.get(entry.timestamp)!.followers.removed
                  .length === 0 &&
                snapshotDetails.get(entry.timestamp)!.following.added.length ===
                  0 &&
                snapshotDetails.get(entry.timestamp)!.following.removed
                  .length === 0
              "
              class="text-center py-4 text-gray-500 dark:text-gray-400"
            >
              No changes in this snapshot
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
