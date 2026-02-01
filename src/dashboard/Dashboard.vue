<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getAllTrackedUsers } from "../utils/storage";
import UserDetails from "./UserDetails.vue";

interface TrackedUser {
  userId: string;
  username: string;
  full_name: string;
  profile_pic_url: string;
  snapshotCount: number;
  lastSnapshot: number | null;
  last_updated: number;
}

const trackedUsers = ref<TrackedUser[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const currentView = ref<"dashboard" | "details">("dashboard");
const selectedUserId = ref<string | null>(null);

onMounted(async () => {
  try {
    loading.value = true;
    trackedUsers.value = await getAllTrackedUsers();
  } catch (err) {
    error.value = "Failed to load tracked users";
    console.error(err);
  } finally {
    loading.value = false;
  }
});

const formatDate = (timestamp: number | null) => {
  if (!timestamp) return "Never";
  return new Date(timestamp).toLocaleString();
};

const formatRelativeTime = (timestamp: number | null) => {
  if (!timestamp) return "Never";
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

const openInstagramProfile = (username: string) => {
  window.open(`https://www.instagram.com/${username}`, "_blank");
};

const refreshData = async () => {
  loading.value = true;
  try {
    trackedUsers.value = await getAllTrackedUsers();
    console.log(await getAllTrackedUsers());
  } catch (err) {
    error.value = "Failed to refresh data";
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const showUserDetails = (userId: string) => {
  selectedUserId.value = userId;
  currentView.value = "details";
};

const backToDashboard = () => {
  currentView.value = "dashboard";
  selectedUserId.value = null;
  refreshData();
};
</script>

<template>
  <!-- Details View -->
  <UserDetails
    v-if="currentView === 'details' && selectedUserId"
    :userId="selectedUserId"
    @back="backToDashboard"
  />

  <!-- Dashboard View -->
  <div v-else id="main" class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="card mb-0 rounded-none">
      <div class="max-w-7xl mx-auto py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              InstaSnap
            </h1>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Track and monitor Instagram snapshots
            </p>
          </div>
          <button
            @click="refreshData"
            class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors duration-200 flex items-center gap-2"
            :disabled="loading"
          >
            <svg
              class="w-5 h-5"
              :class="{ 'animate-spin': loading }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
      >
        <p class="text-red-800 dark:text-red-200">{{ error }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="trackedUsers.length === 0" class="card text-center py-12">
        <svg
          class="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          No snapshots yet
        </h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Start tracking Instagram profiles to see snapshots here.
        </p>
      </div>

      <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="user in trackedUsers"
          :key="user.userId"
          class="card hover:shadow-lg transition-shadow duration-200"
        >
          <div class="flex items-center gap-4">
            <img
              :src="user.profile_pic_url"
              :alt="user.username"
              referrerpolicy="no-referrer"
              class="w-16 h-16 rounded-full object-cover border-2 border-emerald-500"
              @error="(e) => (e.target as HTMLImageElement).src = '/images/user_avatar.png'"
            />
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {{ user.full_name || user.username }}
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 truncate">
                @{{ user.username }}
              </p>
            </div>
          </div>

          <div class="mt-6 grid grid-cols-2 gap-4">
            <div class="border-2 border-gray-700 rounded-lg p-3">
              <p class="text-xs text-gray-600 dark:text-gray-400">Snapshots</p>
              <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {{ user.snapshotCount }}
              </p>
            </div>
            <div class="border-2 border-gray-700 rounded-lg p-3">
              <p class="text-xs text-gray-600 dark:text-gray-400">Last Snapshot</p>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">
                {{ formatRelativeTime(user.lastSnapshot) }}
              </p>
            </div>
          </div>

          <div class="mt-4 text-xs text-gray-500 dark:text-gray-400">
            <span>Updated: {{ formatDate(user.lastSnapshot) }}</span>
          </div>

          <div class="mt-4 flex gap-2">
            <button
              @click="openInstagramProfile(user.username)"
              class="flex-1 px-4 py-2 bg-emerald-600 cursor-pointer hover:brightness-95 active:scale-95 rounded-xl duration-200 text-sm font-medium text-black"
            >
              Open in Instagram
            </button>
            <button
              @click="showUserDetails(user.userId)"
              class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 text-sm cursor-pointer font-medium"
            >
              Details
            </button>
          </div>
        </div>
      </div>

      <div v-if="trackedUsers.length > 0" class="card mt-8 py-10">
        <h2 class="text-4xl text-center font-semibold text-gray-900 dark:text-white mb-10">
          Summary
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="text-center">
            <p class="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {{ trackedUsers.length }}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Tracked Users
            </p>
          </div>
          <div class="text-center">
            <p class="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {{ trackedUsers.reduce((sum, u) => sum + u.snapshotCount, 0) }}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total Snapshots
            </p>
          </div>
          <div class="text-center">
            <p class="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {{ trackedUsers.filter(u => u.lastSnapshot && (Date.now() - u.lastSnapshot) < 86400000).length }}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Active Today
            </p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
</style>