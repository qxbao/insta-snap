<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from "vue";
import Fa6SolidCamera from "~icons/fa6-solid/camera";
import Fa6SolidChartSimple from "~icons/fa6-solid/chart-simple";
import Fa6SolidSpinner from "~icons/fa6-solid/spinner";
import Copyright from "~icons/mdi/copyright";

import { ActionType, ExtensionMessage } from "../constants/actions";
import { useAppStore } from "../stores/app.store";
import { sendMessageToActiveTab, sendMessageWithRetry } from "../utils/chrome";
import { createLogger } from "../utils/logger";
import { useI18n } from "vue-i18n";

const logger = createLogger("Popup");
const igUsername = ref<string | null>(null);
const igProfilePattern = /^(https:\/\/www\.instagram\.com\/)[\w.]+[\/]?$/g;
const appStore = useAppStore();
const cronSetting = ref<{ interval: number; enabled: boolean }>({
  interval: 24,
  enabled: false,
});
const userId = ref<string | null>(null);
const { t } = useI18n();

appStore.loadSnapshotCrons();
appStore.loadTrackedUsers();

onMounted(async () => {
  await appStore.loadLocks();
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (activeTab && activeTab.url) {
      const url = new URL(activeTab.url);
      if (igProfilePattern.test(url.href)) {
        const pathSegments = url.pathname.split("/").filter(Boolean);
        if (pathSegments.length > 0) {
          igUsername.value = pathSegments[0];
        }

        try {
          const response = await sendMessageWithRetry<string>(
            {
              type: ActionType.GET_USER_INFO,
              payload: igUsername.value,
            } satisfies ExtensionMessage,
            {
              maxRetries: 100,
              retryDelay: 1000,
              timeout: 5000,
            },
          );

          logger.debug("User info response:", response);
          const uid = response?.payload;
          userId.value = uid || null;
        } catch (error) {
          logger.error("Failed to get user info after retries:", error);
          userId.value = null;
        }
      }
    }
  } catch (error) {
    logger.error("Error fetching active tab:", error);
  }
});

const sendSnapshotSignal = async () => {
  await appStore.tryLockUser(userId.value || "");
  sendMessageToActiveTab({
    type: ActionType.TAKE_SNAPSHOT,
    payload: { username: igUsername.value },
  } satisfies ExtensionMessage);
};

const openDashboard = () => {
  chrome.runtime.openOptionsPage();
};

const forceUnlock = async () => {
  if (userId.value) {
    await appStore.unlockUser(userId.value);
  }
};

const handleCronChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const checked = target.checked;
  if (userId.value) {
    if (checked) {
      await appStore.addUserSnapshotCron(userId.value, cronSetting.value.interval);
      cronSetting.value.enabled = true;
    } else {
      await appStore.removeUserSnapshotCron(userId.value);
      cronSetting.value.enabled = false;
    }
    await appStore.loadSnapshotCrons();
    target.checked = appStore.snapshotCrons.some((cron) => cron.uid === userId.value);
  }
};

const updateCronInterval = async () => {
  if (userId.value && cronSetting.value.enabled) {
    await appStore.addUserSnapshotCron(userId.value, cronSetting.value.interval);
  }
};

const isProcessing = computed(() => userId.value && userId.value in appStore.activeLocks);

const cronSettingForUser = computed(() => {
  if (!userId.value || !appStore.scLoaded) return null;

  const cron = appStore.snapshotCrons.find((c) => c.uid === userId.value);
  return cron ? { interval: cron.interval, enabled: true } : { interval: 24, enabled: false };
});

watchEffect(() => {
  if (cronSettingForUser.value) {
    cronSetting.value = { ...cronSettingForUser.value };
  }
});

const currentUserData = computed(() => {
  if (!userId.value) return null;
  return appStore.trackedUsers.find((user) => user.id === userId.value);
});

const snapshotCount = computed(() => currentUserData.value?.snapshotCount ?? -1);
const lastSnapshotTime = computed(() => currentUserData.value?.lastSnapshot ?? null);
</script>

<template>
  <div id="main" class="p-3 w-100">
    <div class="p-5 mb-3 text-center card">
      <div class="flex justify-center gap-1 text-sm">
        <div>{{ t("popup.profile") }}:</div>
        <div class="font-bold" :class="igUsername ? 'text-emerald-600' : 'text-theme'">
          {{ igUsername ? `@${igUsername}` : t("errors.undetected_profile") }}
        </div>
      </div>
      <div id="snapshotBtnContainer" :class="{ 'mb-3': igUsername }">
        <div v-if="!igUsername">
          <p class="mt-2 mb-3 text-xs text-gray-500">
            {{ t("popup.no_profile_recommend") }}
          </p>
        </div>
        <div class="flex flex-col items-center" v-else>
          <button
            class="flex justify-center items-center gap-2 mt-3 px-8 py-2 theme-btn cursor-pointer font-semibold text-lg rounded disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            @click="sendSnapshotSignal"
            :disabled="userId ? userId in appStore.activeLocks : true"
          >
            <Fa6SolidCamera v-if="userId && !isProcessing" />
            <Fa6SolidSpinner v-else class="animate-spin" />
            {{
              isProcessing
                ? t("popup.status.processing")
                : userId
                  ? t("popup.status.ready")
                  : t("popup.status.syncing")
            }}
          </button>
          <div class="mt-2" v-if="isProcessing">
            <a
              class="text-xs text-theme underline font-semibold cursor-pointer"
              @click="forceUnlock"
            >
              {{ t("popup.force_unlock") }}
            </a>
          </div>
        </div>
      </div>
      <div id="snapshot-info" class="flex flex-col gap-1 mb-3 text-center" v-if="igUsername">
        <p class="mb-1 text-sm font-bold text-gray-800 dark:text-gray-300">
          {{ t("popup.metadata.title") }}
        </p>
        <p class="text-xs text-gray-600 dark:text-gray-400">
          {{ t("popup.metadata.total_snapshots") }}:
          <span class="font-bold text-emerald-700 dark:text-emerald-500">
            {{ snapshotCount == -1 ? 0 : snapshotCount }}
          </span>
        </p>
        <p class="text-xs text-gray-600 dark:text-gray-400">
          {{ t("popup.metadata.last_snapshot") }}:
          <span class="font-bold text-emerald-700 dark:text-emerald-500">
            {{
              new Date(lastSnapshotTime || 0).getTime() == 0
                ? t("popup.metadata.never")
                : new Date(lastSnapshotTime || 0).toLocaleString()
            }}
          </span>
        </p>
      </div>
      <div class="flex justify-center">
        <button
          @click="openDashboard"
          class="flex justify-center gap-2 mt-2 px-4 py-2 bg-nocontrast text-contrast brightness-90 cursor-pointer font-semibold text-sm rounded-xl active:scale-[0.95] transition-all duration-300"
        >
          <Fa6SolidChartSimple />
          {{ t("popup.open_dashboard") }}
        </button>
      </div>
    </div>
    <div v-if="userId" class="py-3 mb-3">
      <p class="font-bold text-xl ms-2">
        {{ t("popup.configurations.title") }}
      </p>
      <div class="flex justify-between">
        <p class="mt-2 text-xs mx-2 text-gray-600 dark:text-gray-400">
          {{ t("popup.configurations.automatic_snapshots") }}
        </p>
        <label class="inline-flex relative items-center cursor-pointer mt-1">
          <input
            type="checkbox"
            class="sr-only peer"
            :disabled="!appStore.scLoaded"
            v-model="cronSetting.enabled"
            v-on:change="handleCronChange"
          />
          <div
            class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
          ></div>
        </label>
      </div>
      <div v-if="cronSetting.enabled" class="mt-4 p-3 card rounded-lg">
        <div class="flex items-center justify-between">
          <label for="interval" class="text-sm font-semibold text-gray-700 dark:text-gray-300"
            >{{ t("popup.configurations.interval") }}
          </label>
          <input
            id="interval"
            type="number"
            min="1"
            max="168"
            class="w-20 px-3 py-1.5 text-center font-semibold bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
            v-model.number="cronSetting.interval"
            @change="updateCronInterval"
          />
        </div>
      </div>
    </div>
    <hr class="mb-3" />
    <div id="copyright">
      <p class="flex justify-center gap-1 text-xs text-center text-lighter font-semibold">
        <Copyright /> {{ new Date().getFullYear() }} qxbao (InstaSnap)
      </p>
    </div>
  </div>
</template>
