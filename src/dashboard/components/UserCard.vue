<script setup lang="ts">
import Fa6SolidArrowUpRightFromSquare from "~icons/fa6-solid/arrow-up-right-from-square";
import Fa6SolidMagnifyingGlassChart from "~icons/fa6-solid/magnifying-glass-chart";
import Fa6SolidTrashCan from "~icons/fa6-solid/trash-can";
import { useTimeFormat } from "../../utils/time";
import { useI18n } from "vue-i18n";

const { formatRelativeTime } = useTimeFormat();
const { t } = useI18n();

interface Props {
  user: TrackedUser;
}

interface Emits {
  (e: "view-details", userId: string): void;
  (e: "open-profile", username: string): void;
  (e: "delete", userId: string): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();
</script>

<template>
  <div class="card hover:shadow-lg transition-shadow duration-200">
    <div class="relative flex items-center gap-4">
      <div
        class="absolute top-0 right-0 p-2 duration-300 text-red-700 cursor-pointer hover:brightness-110"
        @click="emit('delete', user.id)"
      >
        <Fa6SolidTrashCan class="text-base" />
      </div>
      <img
        :src="user.avatarURL || '/images/user_avatar.png'"
        :alt="user.username"
        referrerpolicy="no-referrer"
        class="w-16 h-16 rounded-full object-cover border-2 border-emerald-500"
        @error="(e) => ((e.target as HTMLImageElement).src = '/images/user_avatar.png')"
      />
      <div class="flex-1 min-w-0">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
          {{ user.fullName || user.username }}
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 truncate">@{{ user.username }}</p>
      </div>
    </div>

    <div class="mt-6 grid grid-cols-2 gap-4">
      <div class="border-2 border-lighter/40 rounded-lg p-3">
        <p class="text-xs text-lighter">
          {{ t("popup.metadata.total_snapshots") }}
        </p>
        <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          {{ user.snapshotCount }}
        </p>
      </div>
      <div class="border-2 border-lighter/40 rounded-lg p-3">
        <p class="text-xs text-lighter">
          {{ t("popup.metadata.last_snapshot") }}
        </p>
        <p class="text-sm font-semibold text-gray-900 dark:text-white">
          {{ formatRelativeTime(user.lastSnapshot) }}
        </p>
      </div>
    </div>

    <div class="mt-4 flex gap-2">
      <button
        @click="emit('view-details', user.id)"
        class="flex justify-center gap-1 px-4 py-2 rounded-xl theme-btn font-semibold flex-1 text-sm"
      >
        <Fa6SolidMagnifyingGlassChart />
        {{ t("dashboard.main.view_details") }}
      </button>
      <button
        @click="emit('open-profile', user.username)"
        class="px-4 py-2 rounded-lg theme-btn bg-gray-600 text-white cursor-pointer active:scale-95 text-sm font-medium"
      >
        <Fa6SolidArrowUpRightFromSquare />
      </button>
    </div>
  </div>
</template>
