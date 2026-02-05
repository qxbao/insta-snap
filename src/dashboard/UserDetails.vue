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
import UserDetailsHeader from "./components/UserDetailsHeader.vue";
import UserStatsGrid from "./components/UserStatsGrid.vue";
import SnapshotTimeline from "./components/SnapshotTimeline.vue";
import HistoryList from "./components/HistoryList.vue";

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

const totalSnapshots = computed(() => meta.value?.logTimeline.length || 0);
const checkpointCount = computed(() => meta.value?.checkpoints.length || 0);

const openInstagramProfile = () => {
  if (userInfo.value) {
    window.open(
      `https://www.instagram.com/${userInfo.value.username}`,
      "_blank",
    );
  }
};

const combinedTimeline = computed(() => {
  const timelineMap = new Map<
    number,
    {
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
  >();

  history.value.followers.forEach((entry) => {
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

  history.value.following.forEach((entry) => {
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

  return Array.from(timelineMap.values()).sort(
    (a, b) => b.timestamp - a.timestamp,
  );
});
</script>

<template>
  <div id="user-details" class="min-h-screen">
    <header class="card mb-0 rounded-none">
      <div class="max-w-7xl mx-auto py-6">
        <div class="flex items-center gap-4">
          <button
            @click="emit('back')"
            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"
        ></div>
      </div>

      <div v-else-if="userInfo && meta">
        <UserDetailsHeader
          :user-info="userInfo"
          :user-id="userId"
          @open-profile="openInstagramProfile"
        />

        <UserStatsGrid
          :total-snapshots="totalSnapshots"
          :checkpoint-count="checkpointCount"
          :current-followers-count="currentFollowers.length"
          :current-following-count="currentFollowing.length"
        />

        <div class="card mb-6">
          <div
            class="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-4"
          >
            <button
              @click="activeTab = 'overview'"
              :class="[
                'px-4 py-2 rounded-lg transition-colors',
                activeTab === 'overview'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
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
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
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
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
              ]"
            >
              Following History
            </button>
          </div>

          <div class="mt-6">
            <SnapshotTimeline
              v-if="activeTab === 'overview'"
              :entries="combinedTimeline"
              :user-id="userId"
            />

            <HistoryList
              v-else-if="activeTab === 'followers'"
              :entries="history.followers"
              type="followers"
              :user-id="userId"
            />

            <HistoryList
              v-else-if="activeTab === 'following'"
              :entries="history.following"
              type="following"
              :user-id="userId"
            />
          </div>
        </div>
      </div>
      <div v-else class="card text-center py-12">
        <p class="text-red-600 dark:text-red-400">
          Failed to load user details
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped></style>
