<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  getUserSnapshotMeta,
  getFollowersHistory,
  getGlobalUserMap,
  getFullFollowersList,
  getFullFollowingList,
  getFollowingHistory,
} from "../utils/storage";
import type { UserSnapshotMeta } from "../types/storage";

interface Props {
  userId: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  back: [];
}>();

const meta = ref<UserSnapshotMeta | null>(null);
const userInfo = ref<any>(null);
const loading = ref(true);
const activeTab = ref<"overview" | "followers" | "following">("overview");
const selectedTimestamps = ref<number[]>([]);

const history = ref<{
  followers: Array<{
    timestamp: number;
    isCheckpoint: boolean;
    addedCount: number;
    removedCount: number;
    totalCount?: number;
  }>;
  following: Array<{
    timestamp: number;
    isCheckpoint: boolean;
    addedCount: number;
    removedCount: number;
    totalCount?: number;
  }>;
}>({
  followers: [],
  following: [],
});

const currentFollowers = ref<string[]>([]);
const currentFollowing = ref<string[]>([]);

onMounted(async () => {
  await loadData();
});

const loadData = async () => {
  loading.value = true;
  try {
    meta.value = await getUserSnapshotMeta(props.userId);
    const userMap = await getGlobalUserMap();
    userInfo.value = userMap[props.userId];
    history.value = {
      followers: await getFollowersHistory(props.userId),
      following: await getFollowingHistory(props.userId),
    };
    
    if (meta.value) {
      currentFollowers.value = await getFullFollowersList(props.userId);
      currentFollowing.value = await getFullFollowingList(props.userId);
    }
  } catch (err) {
    console.error("Failed to load user details:", err);
  } finally {
    loading.value = false;
  }
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

const totalSnapshots = computed(() => meta.value?.logTimeline.length || 0);
const checkpointCount = computed(() => meta.value?.checkpoints.length || 0);
const deltaCount = computed(() => totalSnapshots.value - checkpointCount.value);

const combinedTimeline = computed(() => {
  const timelineMap = new Map<number, {
    timestamp: number;
    isCheckpoint: boolean;
    followers: { addedCount: number; removedCount: number; totalCount?: number };
    following: { addedCount: number; removedCount: number; totalCount?: number };
  }>();

  // Add followers entries
  history.value.followers.forEach(entry => {
    if (!timelineMap.has(entry.timestamp)) {
      timelineMap.set(entry.timestamp, {
        timestamp: entry.timestamp,
        isCheckpoint: entry.isCheckpoint,
        followers: { addedCount: 0, removedCount: 0 },
        following: { addedCount: 0, removedCount: 0 },
      });
    }
    const item = timelineMap.get(entry.timestamp)!;
    item.followers = {
      addedCount: entry.addedCount,
      removedCount: entry.removedCount,
      totalCount: entry.totalCount,
    };
  });

  // Add following entries
  history.value.following.forEach(entry => {
    if (!timelineMap.has(entry.timestamp)) {
      timelineMap.set(entry.timestamp, {
        timestamp: entry.timestamp,
        isCheckpoint: entry.isCheckpoint,
        followers: { addedCount: 0, removedCount: 0 },
        following: { addedCount: 0, removedCount: 0 },
      });
    }
    const item = timelineMap.get(entry.timestamp)!;
    item.following = {
      addedCount: entry.addedCount,
      removedCount: entry.removedCount,
      totalCount: entry.totalCount,
    };
  });

  return Array.from(timelineMap.values()).sort((a, b) => b.timestamp - a.timestamp);
});

const openInstagramProfile = () => {
  if (userInfo.value) {
    window.open(`https://www.instagram.com/${userInfo.value.username}`, "_blank");
  }
};
</script>

<template>
  <div id="user-details" class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="card mb-0 rounded-none">
      <div class="max-w-7xl mx-auto py-6">
        <div class="flex items-center gap-4">
          <button
            @click="emit('back')"
            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div class="flex-1">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              User Details
            </h1>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              View snapshot history and analytics
            </p>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>

      <div v-else-if="userInfo && meta">
        <!-- User Info Card -->
        <div class="card mb-6">
          <div class="flex items-center gap-6">
            <img
              :src="userInfo.profile_pic_url"
              :alt="userInfo.username"
              referrerpolicy="no-referrer"
              class="w-24 h-24 rounded-full object-cover border-2 border-emerald-500"
            />
            <div class="flex-1">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ userInfo.full_name || userInfo.username }}
              </h2>
              <p class="text-gray-600 dark:text-gray-400">@{{ userInfo.username }}</p>
              <button
                @click="openInstagramProfile"
                class="mt-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                View on Instagram →
              </button>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-600 dark:text-gray-400">User ID</p>
              <p class="text-lg font-mono text-gray-900 dark:text-white">{{ userId }}</p>
            </div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div class="card text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">Total Snapshots</p>
            <p class="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {{ totalSnapshots }}
            </p>
          </div>
          <div class="card text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">Checkpoints</p>
            <p class="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {{ checkpointCount }}
            </p>
          </div>
          <div class="card text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">Current Followers</p>
            <p class="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {{ currentFollowers.length }}
            </p>
          </div>
          <div class="card text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">Current Following</p>
            <p class="text-3xl font-bold text-pink-600 dark:text-pink-400">
              {{ currentFollowing.length }}
            </p>
          </div>
        </div>

        <!-- Tabs -->
        <div class="card mb-6">
          <div class="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-4">
            <button
              @click="activeTab = 'overview'"
              :class="[
                'px-4 py-2 rounded-lg transition-colors',
                activeTab === 'overview'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              ]"
            >
              Overview
            </button>
            <button
              @click="activeTab = 'followers'"
              :class="[
                'px-4 py-2 rounded-lg transition-colors',
                activeTab === 'followers'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              ]"
            >
              Followers History
            </button>
            <button
              @click="activeTab = 'following'"
              :class="[
                'px-4 py-2 rounded-lg transition-colors',
                activeTab === 'following'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              ]"
            >
              Following History
            </button>
          </div>

          <!-- Tab Content -->
          <div class="mt-6">
            <!-- Overview Tab -->
            <div v-if="activeTab === 'overview'">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Snapshot Timeline
              </h3>
              <div class="space-y-2">
                <div
                  v-for="entry in combinedTimeline"
                  :key="entry.timestamp"
                  class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div class="flex items-center gap-4">
                    <div
                      :class="[
                        'w-3 h-3 rounded-full',
                        entry.isCheckpoint ? 'bg-blue-500' : 'bg-gray-400'
                      ]"
                    ></div>
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {{ entry.isCheckpoint ? 'Checkpoint' : 'Delta' }}
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
                    <p v-if="entry.isCheckpoint" class="text-sm text-gray-600 dark:text-gray-400">
                      Total: 
                      <span class="font-semibold">{{ entry.followers.totalCount || 0 }}</span>
                      /
                      <span class="font-semibold">{{ entry.following.totalCount || 0 }}</span>
                    </p>
                    <p v-else class="text-sm">
                      <span class="text-green-600 dark:text-green-400">+{{ entry.followers.addedCount }}</span>
                      <span class="text-red-600 dark:text-red-400">-{{ entry.followers.removedCount }}</span>
                      /
                      <span class="text-green-600 dark:text-green-400">+{{ entry.following.addedCount }}</span>
                      <span class="text-red-600 dark:text-red-400">-{{ entry.following.removedCount }}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Followers History Tab -->
            <div v-else-if="activeTab === 'followers'">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Followers Changes Over Time
              </h3>
              <div class="space-y-2">
                <div
                  v-for="entry in history.followers"
                  :key="entry.timestamp"
                  class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div class="flex items-center gap-4">
                    <div
                      :class="[
                        'w-3 h-3 rounded-full',
                        entry.isCheckpoint ? 'bg-blue-500' : 'bg-gray-400'
                      ]"
                    ></div>
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {{ entry.isCheckpoint ? 'Checkpoint' : 'Delta' }}
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
                    <p v-if="entry.isCheckpoint" class="text-sm text-gray-600 dark:text-gray-400">
                      Total: <span class="font-semibold">{{ entry.totalCount }}</span>
                    </p>
                    <p v-else class="text-sm">
                      <span class="text-green-600 dark:text-green-400">+{{ entry.addedCount }}</span>
                      /
                      <span class="text-red-600 dark:text-red-400">-{{ entry.removedCount }}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Following History Tab -->
            <div v-else-if="activeTab === 'following'">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Following Changes Over Time
              </h3>
              <div class="space-y-2">
                <div
                  v-for="entry in history.following"
                  :key="entry.timestamp"
                  class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div class="flex items-center gap-4">
                    <div
                      :class="[
                        'w-3 h-3 rounded-full',
                        entry.isCheckpoint ? 'bg-blue-500' : 'bg-gray-400'
                      ]"
                    ></div>
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {{ entry.isCheckpoint ? 'Checkpoint' : 'Delta' }}
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
                    <p v-if="entry.isCheckpoint" class="text-sm text-gray-600 dark:text-gray-400">
                      Total: <span class="font-semibold">{{ entry.totalCount }}</span>
                    </p>
                    <p v-else class="text-sm">
                      <span class="text-green-600 dark:text-green-400">+{{ entry.addedCount }}</span>
                      /
                      <span class="text-red-600 dark:text-red-400">-{{ entry.removedCount }}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else class="card text-center py-12">
        <p class="text-red-600 dark:text-red-400">Failed to load user details</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
#user-details {
  font-family: system-ui, -apple-system, sans-serif;
}
</style>
