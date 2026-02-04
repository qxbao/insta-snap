<script setup lang="ts">
import { useUIStore } from "../stores/ui.store";
const ui = useUIStore();
</script>

<template>
  <div style="height: 100%">
    <Transition
      v-if="ui.loading"
      enter-active-class="transition-opacity duration-300"
      leave-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        style="height: 100%"
        class="fixed -translate-x-1/2 -translate-y-1/2 pointer-events-auto top-1/2 left-1/2"
      >
        <div
          style="height: 100%"
          class="flex flex-col items-center justify-center"
        >
          <div
            class="bg-emerald-900/70 w-100 text-white flex flex-col items-center p-8 rounded-3xl shadow-lg backdrop-blur-md border-2 border-[#10B981]/30"
          >
            <h3 class="mb-3 text-2xl font-bold tracking-tight">
              Taking snapshot...
            </h3>
            <p
              class="mb-2 text-sm leading-relaxed text-gray-400 dark:text-gray-400"
            >
              For a while, please don't leave this page
            </p>
            <p
              v-if="ui.progress.target"
              class="text-[13px] font-semibold text-blue-500 mt-4 pt-4 border-t border-black/8 dark:border-white/8"
            >
              Loaded {{ ui.progress.loaded }} of {{ ui.progress.target }} users
            </p>
          </div>
        </div>
      </div>
    </Transition>

    <Transition
      v-if="ui.isNotifyVisible"
      enter-active-class="animate-[slideDown_0.4s_cubic-bezier(0.34,1.56,0.64,1)]"
      leave-active-class="animate-[slideUp_0.3s_ease-out]"
    >
      <div
        class="fixed top-6 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2),inset_0_0_0_1px_rgba(255,255,255,0.2)] backdrop-blur-xl font-semibold text-[15px] text-white max-w-125 animate-[float_3s_ease-in-out_infinite]"
        :class="{
          'bg-linear-to-r from-emerald-700/95 to-green-800/95':
            ui.notifyType === 'success',
          'bg-linear-to-r from-red-600/95 to-red-700/95':
            ui.notifyType === 'error',
          'bg-linear-to-r from-blue-500/95 to-blue-600/95':
            ui.notifyType === 'info',
          'bg-gray-700/95': !ui.notifyType,
        }"
      >
        <div class="w-6 h-6 shrink-0">
          <svg
            v-if="ui.notifyType === 'success'"
            class="w-full h-full"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
          <svg
            v-else-if="ui.notifyType === 'error'"
            class="w-full h-full"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
          <svg
            v-else
            class="w-full h-full"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
        </div>
        <span class="leading-snug">{{ ui.notifyMessage }}</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@keyframes float {
  0%,
  100% {
    transform: translateX(-50%) translateY(0);
  }
  50% {
    transform: translateX(-50%) translateY(-4px);
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
}
</style>
