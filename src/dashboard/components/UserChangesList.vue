<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useVirtualList } from "@vueuse/core";

interface Props {
  users: string[];
  userMap: Record<string, UserMetadata>;
  timestamp: number;
  section: string;
  title: string;
  colorClass: "green" | "red";
}

const props = defineProps<Props>();
const { t } = useI18n();

const visibleCount = ref(10);
const USERS_PER_PAGE = 10;

const loadMore = () => {
  visibleCount.value += USERS_PER_PAGE;
};

const loadAll = () => {
  visibleCount.value = props.users.length;
};

const getUserInfo = (userId: string) => {
  return (
    props.userMap[userId] ||
    ({
      id: userId,
      username: userId,
      fullName: "",
      avatarURL: "",
      updatedAt: 0,
    } satisfies UserMetadata)
  );
};

const colorClasses = {
  green: "text-green-600 dark:text-green-400",
  red: "text-red-600 dark:text-red-400",
};

const { list, containerProps, wrapperProps } = useVirtualList(
  computed(() => props.users.slice(0, visibleCount.value)),
  {
    itemHeight: 56,
    overscan: 5,
  },
);
</script>

<template>
  <div v-if="users.length > 0">
    <h4 class="text-sm font-semibold mb-2" :class="colorClasses[colorClass]">
      {{ title }} ({{ users.length }})
    </h4>
    <div v-bind="containerProps" style="max-height: 400px; overflow-y: auto">
      <div v-bind="wrapperProps">
        <div
          v-for="{ data: userId } in list"
          :key="userId"
          class="flex items-center gap-2 py-2 px-4 bg-lighter/5 rounded"
        >
          <img
            :src="getUserInfo(userId).avatarURL || '/images/user_avatar.png'"
            :alt="getUserInfo(userId).username"
            referrerpolicy="no-referrer"
            class="w-8 h-8 rounded-full object-cover"
            @error="
              (e) =>
                ((e.target as HTMLImageElement).src = '/images/user_avatar.png')
            "
          />
          <div class="min-w-0 flex-1">
            <p
              class="text-sm font-medium text-gray-900 dark:text-white truncate"
            >
              {{ getUserInfo(userId).fullName || getUserInfo(userId).username }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
              @{{ getUserInfo(userId).username }}
            </p>
          </div>
        </div>
      </div>
    </div>
    <div v-if="visibleCount < users.length" class="flex gap-2 mt-2">
      <button
        @click="loadMore"
        class="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
      >
        {{ t("dashboard.details.changes.load_more") }}
      </button>
      <span class="text-gray-400">•</span>
      <button
        @click="loadAll"
        class="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
      >
        {{ t("dashboard.details.changes.load_all") }}
      </button>
    </div>
  </div>
</template>
