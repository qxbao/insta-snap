<script setup lang="ts">
import { ref, onMounted } from "vue";
import { sendMessageToActiveTab } from "../utils/chrome";
import { ActionType, ExtensionMessage } from "../constants/actions";
import {
  getUserLastSnapshotTime,
  getUserSnapshotCount,
} from "../utils/storage";

const igUsername = ref<string | null>(null);
const snapshotCount = ref<number>(0);
const lastSnapshotTime = ref<number | null>(null);
const igProfilePattern = /^(https:\/\/www\.instagram\.com\/)[\w.]+[\/]?$/g;

onMounted(async () => {
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
          async (response: { userId: string }) => {
            console.log("User info response:", response);
            if (response?.userId) {
              snapshotCount.value = await getUserSnapshotCount(response.userId);
              lastSnapshotTime.value = await getUserLastSnapshotTime(
                response.userId,
              );
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
  sendMessageToActiveTab(
    {
      type: ActionType.TAKE_SNAPSHOT,
      payload: { username: igUsername.value },
    } satisfies ExtensionMessage,
    (response: string) => {
      console.log("Snapshot response:", response);
    },
  );
};
</script>

<template>
  <div id="main" class="w-100 p-3">
    <div class="card mb-3 p-5 text-center">
      <div class="text-sm flex justify-center gap-1">
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
          <p class="text-xs text-gray-500 mt-2">
            Navigate to an Instagram profile page to use this feature.
          </p>
        </div>
        <div v-else>
          <button
            class="mt-3 px-8 py-2 bg-emerald-500 text-black cursor-pointer font-semibold text-lg rounded hover:bg-emerald-500 hover:text-black active:scale-[0.95] transition-all duration-300"
            @click="sendSnapshotSignal"
          >
            Take Snapshot
          </button>
        </div>
      </div>
      <div
        id="snapshot-info"
        class="text-center flex flex-col gap-1 mb-3"
        v-if="igUsername"
      >
        <p class="text-sm font-bold text-gray-800 dark:text-gray-300 mb-1">
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
    </div>
    <hr class="mb-3" />
    <div id="copyright">
      <p class="text-center text-xs text-gray-500">
        &copy; {{ new Date().getFullYear() }} InstaSnap. All rights reserved.
      </p>
    </div>
  </div>
</template>
