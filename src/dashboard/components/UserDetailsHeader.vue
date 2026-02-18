<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface Props {
  userInfo: {
    username: string;
    fullName?: string;
    avatarURL: string;
  };
  userId: string;
}

interface Emits {
  (e: "open-profile"): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();
const { t } = useI18n();
</script>

<template>
  <div class="card mb-6">
    <div class="flex items-center gap-6">
      <img
        :src="userInfo.avatarURL"
        :alt="userInfo.username"
        referrerpolicy="no-referrer"
        class="w-24 h-24 rounded-full object-cover border-2 border-emerald-500"
      />
      <div class="flex-1">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ userInfo.fullName || userInfo.username }}
        </h2>
        <p class="text-gray-600 dark:text-gray-400">@{{ userInfo.username }}</p>
        <button
          @click="emit('open-profile')"
          class="mt-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
        >
          {{ t("dashboard.details.header.view_on_instagram") }} →
        </button>
      </div>
      <div class="text-right">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ t("dashboard.details.header.user_id") }}
        </p>
        <p class="text-lg font-mono text-gray-900 dark:text-white">
          {{ userId }}
        </p>
      </div>
    </div>
  </div>
</template>
