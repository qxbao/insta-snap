<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { getAllTrackedUsers } from "../utils/storage";
import UserDetails from "./UserDetails.vue";
import Fa6SolidArrowUpRightFromSquare from "~icons/fa6-solid/arrow-up-right-from-square";
import Fa6SolidRotateLeft from "~icons/fa6-solid/rotate-left";
import Fa6SolidMagnifyingGlassChart from "~icons/fa6-solid/magnifying-glass-chart";
import Fa6SolidFolderOpen from "~icons/fa6-solid/folder-open";
import Fa6SolidChevronLeft from "~icons/fa6-solid/chevron-left";
import Fa6SolidChevronRight from "~icons/fa6-solid/chevron-right";

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
const currentPage = ref(1);
const usersPerPage = 6;

const totalPages = computed(() => Math.ceil(trackedUsers.value.length / usersPerPage));
const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * usersPerPage;
  const end = start + usersPerPage;
  return trackedUsers.value.slice(start, end);
});

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
    currentPage.value = 1;
  } catch (err) {
    error.value = "Failed to refresh data";
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
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
  <UserDetails
    v-if="currentView === 'details' && selectedUserId"
    :userId="selectedUserId"
    @back="backToDashboard"
  />

  <div v-else id="main" class="min-h-screen">
    <header class="card mb-0 rounded-none">
      <div class="max-w-7xl mx-auto py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              InstaSnap
            </h1>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Track and monitor Instagram profiles with ease.
            </p>
          </div>
          <button
            @click="refreshData"
            class="flex justify-center gap-1 px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-600 transition-colors duration-200 font-semibold items-center cursor-pointer text-gray-900"
            :disabled="loading"
          >
            <Fa6SolidRotateLeft :class="{ 'animate-spin': loading }" />
            <span>
              {{ loading ? "Refreshing..." : "Refresh" }}
            </span>
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"
        ></div>
      </div>

      <div
        v-else-if="error"
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
      >
        <p class="text-red-800 dark:text-red-200">{{ error }}</p>
      </div>

      <div v-else-if="trackedUsers.length === 0" class="card text-center py-12">
        <Fa6SolidFolderOpen class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          No snapshots yet
        </h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Start tracking Instagram profiles to see snapshots here.
        </p>
      </div>

      <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="user in paginatedUsers"
          :key="user.userId"
          class="card hover:shadow-lg transition-shadow duration-200"
        >
          <div class="flex items-center gap-4">
            <img
              :src="user.profile_pic_url"
              :alt="user.username"
              referrerpolicy="no-referrer"
              class="w-16 h-16 rounded-full object-cover border-2 border-emerald-500"
              @error="
                (e) =>
                  ((e.target as HTMLImageElement).src =
                    '/images/user_avatar.png')
              "
            />
            <div class="flex-1 min-w-0">
              <h3
                class="text-lg font-semibold text-gray-900 dark:text-white truncate"
              >
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
              <p
                class="text-2xl font-bold text-emerald-600 dark:text-emerald-400"
              >
                {{ user.snapshotCount }}
              </p>
            </div>
            <div class="border-2 border-gray-700 rounded-lg p-3">
              <p class="text-xs text-gray-600 dark:text-gray-400">
                Last Snapshot
              </p>
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
              @click="showUserDetails(user.userId)"
              class="flex justify-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 text-gray-900 font-semibold flex-1 transition-colors duration-200 text-sm cursor-pointer"
            >
              <Fa6SolidMagnifyingGlassChart />
              View Details
            </button>
            <button
              @click="openInstagramProfile(user.username)"
              class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer hover:brightness-95 active:scale-95 duration-200 text-sm font-medium"
            >
              <Fa6SolidArrowUpRightFromSquare />
            </button>
          </div>
        </div>
      </div>

      <div v-if="trackedUsers.length > usersPerPage" class="flex justify-center items-center gap-2 mt-8">
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <Fa6SolidChevronLeft class="w-5 h-5" />
        </button>
        
        <div class="flex gap-2">
          <button
            v-for="page in totalPages"
            :key="page"
            @click="goToPage(page)"
            :class="[
              'px-4 py-2 rounded-lg font-semibold transition-colors duration-200',
              currentPage === page
                ? 'bg-emerald-600 text-gray-900'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            ]"
          >
            {{ page }}
          </button>
        </div>

        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <Fa6SolidChevronRight class="w-5 h-5" />
        </button>
      </div>

      <div v-if="trackedUsers.length > 0" class="card mt-8 py-10">
        <h2
          class="text-4xl text-center font-semibold text-gray-900 dark:text-white mb-10"
        >
          Summary
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="text-center">
            <p
              class="text-3xl font-bold text-emerald-600 dark:text-emerald-400"
            >
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
              {{
                trackedUsers.filter(
                  (u) =>
                    u.lastSnapshot && Date.now() - u.lastSnapshot < 86400000,
                ).length
              }}
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

<style scoped></style>
