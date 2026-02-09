<script setup lang="ts">
import type { TrackedUser } from "../../stores/app.store";
import Fa6SolidClock from "~icons/fa6-solid/clock";
import Fa6SolidPlus from "~icons/fa6-solid/plus";
import Fa6SolidPenToSquare from "~icons/fa6-solid/pen-to-square";
import Fa6SolidTrashCan from "~icons/fa6-solid/trash-can";
import { useTimeFormat } from "../../utils/time";
import { useI18n } from "vue-i18n";

interface Props {
  snapshotCrons: SnapshotCron[];
  trackedUsers: TrackedUser[];
}

interface Emits {
  (e: "open-cron-modal", uid: string | null): void;
  (e: "delete-cron", uid: string): void;
}

defineProps<Props>();
const { formatIntervalTime } = useTimeFormat();
const emit = defineEmits<Emits>();
const { t } = useI18n();

const getUsernameById = (uid: string, trackedUsers: TrackedUser[]) => {
  const user = trackedUsers.find((u) => u.userId === uid);
  return user ? user.username : uid;
};

const getUserById = (uid: string, trackedUsers: TrackedUser[]) => {
  return trackedUsers.find((u) => u.userId === uid);
};

const formatLastRun = (timestamp: number) => {
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
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <Fa6SolidClock class="text-4xl" />
        <div>
          <h2 class="text-2xl font-bold text-nocontrast">
            {{ t("dashboard.main.cronjob.title") }}
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t("dashboard.main.cronjob.desc") }}
          </p>
        </div>
      </div>
      <button
        @click="emit('open-cron-modal', null)"
        class="flex items-center gap-2 px-4 py-2 rounded-lg theme-btn font-semibold cursor-pointer"
      >
        <Fa6SolidPlus />
        <span>{{ t("dashboard.main.cronjob.add_schedule") }}</span>
      </button>
    </div>

    <div
      v-if="snapshotCrons.length === 0"
      class="text-center py-8"
    >
      <Fa6SolidClock class="mx-auto h-12 w-12 text-gray-400" />
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {{ t("dashboard.main.cronjob.no_cron_recommend") }}
      </p>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="cron of snapshotCrons"
        :key="cron.uid"
        class="border-2 border-lighter/40 rounded-lg p-4 hover:border-emerald-500 transition-colors duration-200"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3 flex-1">
            <img
              :src="
                getUserById(cron.uid, trackedUsers)?.profile_pic_url ||
                '/images/user_avatar.png'
              "
              :alt="getUsernameById(cron.uid, trackedUsers)"
              referrerpolicy="no-referrer"
              class="w-10 h-10 rounded-full object-cover border-2 border-emerald-500"
              @error="
                (e) =>
                  ((e.target as HTMLImageElement).src =
                    '/images/user_avatar.png')
              "
            />
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-gray-900 dark:text-white truncate">
                {{
                  getUserById(cron.uid, trackedUsers)?.full_name ||
                  getUsernameById(cron.uid, trackedUsers)
                }}
              </h3>
              <p class="text-xs text-gray-600 dark:text-gray-400 truncate">
                @{{ getUsernameById(cron.uid, trackedUsers) }}
              </p>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              @click="emit('open-cron-modal', cron.uid)"
              class="p-1.5 text-blue-500 hover:text-blue-700 transition-colors cursor-pointer"
              title="Edit"
            >
              <Fa6SolidPenToSquare />
            </button>
            <button
              @click="emit('delete-cron', cron.uid)"
              class="p-1.5 text-red-700 hover:brightness-110 transition-colors cursor-pointer"
              title="Delete"
            >
              <Fa6SolidTrashCan />
            </button>
          </div>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p class="text-xs text-gray-600 dark:text-gray-400">
              {{ t("dashboard.main.cronjob.interval") }}
            </p>
            <p class="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {{ formatIntervalTime(cron.interval) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-600 dark:text-gray-400">
              {{ t("dashboard.main.cronjob.last_run") }}
            </p>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ formatLastRun(cron.lastRun) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
