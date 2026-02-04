<script setup lang="ts">
import { useUIStore } from "../stores/ui.store";
import Fa6SolidCameraRetro from '~icons/fa6-solid/camera-retro'
import Fa6SolidCheck from '~icons/fa6-solid/check'
import Fa6SolidXmark from '~icons/fa6-solid/xmark'
import Fa6SolidCircleInfo from '~icons/fa6-solid/circle-info'

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
            class="bg-linear-to-br opacity-90 from-purple-600/80 via-pink-500/80 to-orange-500/80 w-100 text-white flex flex-col items-center p-8 rounded-3xl shadow-lg backdrop-blur-md border-2 border-[#10B981]/30"
          >
            <h3 class="mb-3 text-2xl font-semibold tracking-tight">
              Taking snapshot
            </h3>
            <div class="mb-3">
              <Fa6SolidCameraRetro class="w-12 h-12 animate-[shake_0.5s_ease-in-out_infinite]" />
            </div>
            <p
              class="mb-2 text-sm leading-relaxed text-gray-200 "
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
          <Fa6SolidCheck v-if="ui.notifyType === 'success'" class="w-full h-full" />
          <Fa6SolidXmark v-else-if="ui.notifyType === 'error'" class="w-full h-full" />
          <Fa6SolidCircleInfo v-else class="w-full h-full" />
        </div>
        <span class="leading-snug">{{ ui.notifyMessage }}</span>
      </div>
    </Transition>
  </div>
</template>
