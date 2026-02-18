<script setup lang="ts">
import { useModalStore } from "../stores/modal.store";
import Fa6SolidXmark from "~icons/fa6-solid/xmark";
import Fa6SolidSpinner from "~icons/fa6-solid/spinner";

const modalStore = useModalStore();

const handleClose = () => {
  if (!modalStore.isLoading) {
    modalStore.closeModal();
  }
};
</script>

<template>
  <div
    v-if="modalStore.isOpen"
    class="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50 p-4"
    @click.self="handleClose"
  >
    <div
      class="card rounded-lg shadow-xl w-full p-6 relative"
      :class="modalStore.props.maxWidth || 'max-w-md'"
    >
      <button
        v-if="!modalStore.isLoading"
        @click="handleClose"
        class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer z-10"
      >
        <Fa6SolidXmark class="text-xl" />
      </button>

      <div v-if="modalStore.isLoading" class="flex justify-center items-center py-8">
        <Fa6SolidSpinner class="animate-spin text-3xl text-theme" />
      </div>

      <component
        v-else-if="modalStore.content"
        :is="modalStore.content"
        v-bind="modalStore.props"
        @close="handleClose"
      />

      <div v-else class="text-center py-8">
        <p class="text-red-500">No content to display</p>
      </div>
    </div>
  </div>
</template>
