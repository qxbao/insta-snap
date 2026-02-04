<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { sendMessageToActiveTab } from "../utils/chrome";
import { ActionType, ExtensionMessage } from "../constants/actions";
import {
  getUserLastSnapshotTime,
  getUserSnapshotCount,
} from "../utils/storage";
import { useAppStore } from "../stores/app.store";
import { ExtensionMessageResponse, Status } from "../constants/status";

import Fa6SolidChartSimple from "~icons/fa6-solid/chart-simple";
const igUsername = ref<string | null>(null);
const snapshotCount = ref<number>(0);
const lastSnapshotTime = ref<number | null>(null);
const igProfilePattern = /^(https:\/\/www\.instagram\.com\/)[\w.]+[\/]?$/g;
const appStore = useAppStore();
const cronSetting = ref<{ interval: number; enabled: boolean }>({
  interval: 24,
  enabled: false,
});
const userId = ref<string | null>(null);

appStore.loadSnapshotCrons();

watch(
  [() => appStore.scLoaded, userId],
  (loaded) => {
    if (loaded && userId.value) {
      if (userId.value in appStore.snapshotCrons) {
        cronSetting.value.interval = appStore.snapshotCrons[userId.value].interval;
        cronSetting.value.enabled = true;
      } else {
        cronSetting.value.interval = 24;
        cronSetting.value.enabled = false;
      }
    }
  },
);

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

        sendMessageToActiveTab(
          {
            type: ActionType.GET_USER_INFO,
          } satisfies ExtensionMessage,
          async (response: ExtensionMessageResponse<string>) => {
            console.log("User info response:", response);
            const uid = response?.payload;
            userId.value = uid || null;
            if (uid) {
              snapshotCount.value = await getUserSnapshotCount(uid);
              lastSnapshotTime.value = await getUserLastSnapshotTime(uid);
            }
          },
        );
      }
    }
  } catch (error) {
    console.error("Error fetching active tab:", error);
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
  const dashboardUrl = chrome.runtime.getURL("dashboard.html");
  chrome.tabs.create({ url: dashboardUrl });
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
    target.checked = userId.value in appStore.snapshotCrons;
  }
};

const updateCronInterval = async () => {
  if (userId.value && cronSetting.value.enabled) {
    await appStore.addUserSnapshotCron(userId.value, cronSetting.value.interval);
  }
};
</script>

<template>
  <div id="main" class="p-3 w-100">
    <div class="p-5 mb-3 text-center card">
      <div class="flex justify-center gap-1 text-sm">
        <div>Profile:</div>
        <div
          class="font-bold"
          :class="
            igUsername
              ? 'text-emerald-700 dark:text-emerald-500'
              : 'text-red-500'
          "
        >
          {{ igUsername ? `@${igUsername}` : "Undetected" }}
        </div>
      </div>
      <div id="snapshotBtnContainer" :class="{ 'mb-3': igUsername }">
        <div v-if="!igUsername">
          <p class="mt-2 mb-3 text-xs text-gray-500">
            Navigate to an Instagram profile page to use this feature.
          </p>
        </div>
        <div v-else>
          <button
            class="mt-3 px-8 py-2 bg-emerald-500 text-black cursor-pointer font-semibold text-lg rounded hover:brightness-110 active:scale-[0.95] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            @click="sendSnapshotSignal"
            :disabled="userId ? userId in appStore.activeLocks : true"
          >
            {{
              userId && userId in appStore.activeLocks
                ? "Processing..."
                : userId
                  ? "Take Snapshot"
                  : "No UID Found"
            }}
          </button>
        </div>
      </div>
      <div
        id="snapshot-info"
        class="flex flex-col gap-1 mb-3 text-center"
        v-if="igUsername"
      >
        <p class="mb-1 text-sm font-bold text-gray-800 dark:text-gray-300">
          This account has:
        </p>
        <p class="text-xs text-gray-600 dark:text-gray-400">
          Total snapshots:
          <span class="font-bold text-emerald-700 dark:text-emerald-500">
            {{ snapshotCount == -1 ? "None" : snapshotCount }}
          </span>
        </p>
        <p class="text-xs text-gray-600 dark:text-gray-400">
          Last snapshot at:
          <span class="font-bold text-emerald-700 dark:text-emerald-500">
            {{
              new Date(lastSnapshotTime || 0).getTime() == 0
                ? "Never"
                : new Date(lastSnapshotTime || 0).toLocaleString()
            }}
          </span>
        </p>
      </div>
      <div class="flex justify-center">
        <button
          @click="openDashboard"
          class="flex justify-center gap-2 mt-2 px-4 py-2 bg-gray-200 text-gray-800 cursor-pointer font-semibold text-sm rounded-xl hover:bg-gray-300 active:scale-[0.95] transition-all duration-300"
        >
          <Fa6SolidChartSimple />
          Open Dashboard
        </button>
      </div>
    </div>
    <div v-if="userId" class="py-3 mb-3">
      <p class="font-bold text-xl ms-2">Configurations</p>
      <div class="flex justify-between">
        <p class="mt-2 text-xs mx-2 text-gray-600 dark:text-gray-400">
          Automatic snapshots at regular intervals
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
            class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
          ></div>
        </label>
      </div>
      <div v-if="cronSetting.enabled" class="mt-4 p-3 card rounded-lg">
        <div class="flex items-center justify-between">
          <label for="interval" class="text-sm font-semibold text-gray-700 dark:text-gray-300"
            >Interval (hours)</label
          >
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
      <p class="text-xs text-center text-gray-500">
        &copy; {{ new Date().getFullYear() }} InstaSnap. All rights reserved.
      </p>
    </div>
  </div>
</template>
