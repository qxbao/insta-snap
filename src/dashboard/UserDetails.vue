<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import Modal from "../shared-components/Modal.vue"
import { database } from "../utils/database"
import SnapshotHistory from "./components/SnapshotHistory.vue"
import UserActivityChart from "./components/UserActivityChart.vue"
import UserDetailsHeader from "./components/UserDetailsHeader.vue"
import UserStatsGrid from "./components/UserStatsGrid.vue"
import { createLogger } from "../utils/logger"

interface Props {
  userId: string
}

const props = defineProps<Props>()
const { t } = useI18n()
const logger = createLogger("UserDetails")
const emit = defineEmits<{
  back: []
}>()

const snapshotCount = ref(0)
const checkpointCount = ref(0)
const userInfo = ref<UserMetadata | null>(null)
const loading = ref(true)
const activeTab = ref<"overview" | "followers" | "following">("overview")
const showCharts = ref(false)

const history = ref<{
  followers: HistoryEntry[]
  following: HistoryEntry[]
}>({
  followers: [],
  following: [],
})

const currentFollowers = ref<string[]>([])
const currentFollowing = ref<string[]>([])

onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  loading.value = true
  try {
    userInfo.value = (await database.userMetadata.get(props.userId)) || null

    const snapshots = await database.snapshots.where("belongToId").equals(props.userId).toArray()

    snapshotCount.value = snapshots.length
    checkpointCount.value = snapshots.filter((s) => {
      return s.isCheckpoint
    }).length

    history.value = {
      followers: await database.getSnapshotHistory(props.userId, true),
      following: await database.getSnapshotHistory(props.userId, false),
    }

    if (snapshotCount.value > 0) {
      const followersSet = await database.getFullList(props.userId, undefined, true)
      const followingSet = await database.getFullList(props.userId, undefined, false)
      currentFollowers.value = Array.from(followersSet)
      currentFollowing.value = Array.from(followingSet)
    }
  }
  catch (err) {
    logger.error("Failed to load user details:", err)
  }
  finally {
    loading.value = false
  }
}

const totalSnapshots = computed(() => snapshotCount.value)
const totalCheckpoints = computed(() => checkpointCount.value)

const openInstagramProfile = () => {
  if (userInfo.value) {
    window.open(`https://www.instagram.com/${userInfo.value.username}`, "_blank")
  }
}

const combinedTimeline = computed(() => {
  const timelineMap = new Map<
    number,
    {
      timestamp: number
      isCheckpoint: boolean
      followers: {
        addedCount: number
        removedCount: number
        totalCount?: number
      }
      following: {
        addedCount: number
        removedCount: number
        totalCount?: number
      }
    }
  >()

  history.value.followers.forEach((entry) => {
    if (!timelineMap.has(entry.timestamp)) {
      timelineMap.set(entry.timestamp, {
        timestamp: entry.timestamp,
        isCheckpoint: entry.isCheckpoint,
        followers: { addedCount: 0, removedCount: 0 },
        following: { addedCount: 0, removedCount: 0 },
      })
    }
    const item = timelineMap.get(entry.timestamp)!
    item.followers = {
      addedCount: entry.addedCount,
      removedCount: entry.removedCount,
      totalCount: entry.totalCount,
    }
  })

  history.value.following.forEach((entry) => {
    if (!timelineMap.has(entry.timestamp)) {
      timelineMap.set(entry.timestamp, {
        timestamp: entry.timestamp,
        isCheckpoint: entry.isCheckpoint,
        followers: { addedCount: 0, removedCount: 0 },
        following: { addedCount: 0, removedCount: 0 },
      })
    }
    const item = timelineMap.get(entry.timestamp)!
    item.following = {
      addedCount: entry.addedCount,
      removedCount: entry.removedCount,
      totalCount: entry.totalCount,
    }
  })

  return Array.from(timelineMap.values()).sort((a, b) => b.timestamp - a.timestamp)
})
</script>
<template>
  <div>
    <header class="card mb-0 rounded-none">
      <div class="max-w-7xl mx-auto py-6">
        <div class="flex items-center gap-4">
          <button
            @click="emit('back')"
            class="p-2 rounded-lg cursor-pointer hover:brightness-90 duration-300"
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
              {{ t("dashboard.details.title") }}
            </h1>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {{ t("dashboard.details.subtitle") }}
            </p>
          </div>
        </div>
      </div>
    </header>
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-theme"></div>
      </div>

      <div v-else-if="userInfo">
        <UserDetailsHeader
          :user-info="userInfo"
          :user-id="userId"
          @open-profile="openInstagramProfile"
        />

        <UserStatsGrid
          :total-snapshots="totalSnapshots"
          :checkpoint-count="totalCheckpoints"
          :current-followers-count="currentFollowers.length"
          :current-following-count="currentFollowing.length"
        />

        <div class="card mb-6">
          <div
            class="flex [&_button]:font-semibold [&_button]:hover:brightness-90 [&_button]:duration-300 [&_button]:hover:duration [&_button]:px-4 [&_button]:py-2 [&_button]:rounded-lg [&_button]:cursor-pointer"
          >
            <div class="flex gap-2">
              <button
                @click="activeTab = 'overview'"
                :class="[activeTab === 'overview' ? 'bg-theme' : 'card-lighter']"
              >
                {{ t("dashboard.details.tabs.overview") }}
              </button>
              <button
                @click="activeTab = 'followers'"
                :class="[activeTab === 'followers' ? 'bg-theme' : 'card-lighter']"
              >
                {{ t("dashboard.details.tabs.followers_history") }}
              </button>
              <button
                @click="activeTab = 'following'"
                :class="[activeTab === 'following' ? 'bg-theme' : 'card-lighter']"
              >
                {{ t("dashboard.details.tabs.following_history") }}
              </button>
            </div>
            <div class="ms-auto flex items-center">
              <label
                for="chartCheckbox"
                class="flex items-center text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
              >
                <input
                  type="checkbox"
                  id="chartCheckbox"
                  v-model="showCharts"
                  class="mr-2 cursor-pointer"
                />
                {{ t("dashboard.details.show_charts") }}
              </label>
            </div>
          </div>

          <UserActivityChart
            v-if="showCharts && combinedTimeline.length > 0"
            :timeline="combinedTimeline"
            :mode="activeTab"
            class="mt-6"
          />

          <div class="mt-6">
            <SnapshotHistory
              v-if="activeTab === 'overview'"
              :entries="combinedTimeline"
              mode="both"
              :user-id="userId"
              @snapshot-deleted="loadData"
            />

            <SnapshotHistory
              v-else-if="activeTab === 'followers'"
              :entries="combinedTimeline"
              mode="followers"
              :user-id="userId"
              @snapshot-deleted="loadData"
            />

            <SnapshotHistory
              v-else-if="activeTab === 'following'"
              :entries="combinedTimeline"
              mode="following"
              :user-id="userId"
              @snapshot-deleted="loadData"
            />
          </div>
        </div>
      </div>
      <div v-else class="card text-center py-12">
        <p class="text-red-600 dark:text-red-400">
          {{ t("dashboard.details.failed_to_load") }}
        </p>
      </div>
    </main>
  </div>
  <Modal />
</template>

<style scoped></style>
