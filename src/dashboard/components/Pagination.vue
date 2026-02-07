<script setup lang="ts">
import Fa6SolidChevronLeft from "~icons/fa6-solid/chevron-left";
import Fa6SolidChevronRight from "~icons/fa6-solid/chevron-right";

interface Props {
	currentPage: number;
	totalPages: number;
}

interface Emits {
	(e: "go-to-page", page: number): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();
</script>

<template>
	<div class="flex justify-center items-center gap-2 mt-8">
		<button
			@click="emit('go-to-page', currentPage - 1)"
			:disabled="currentPage === 1"
			class="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
		>
			<Fa6SolidChevronLeft class="w-5 h-5" />
		</button>

		<div class="flex gap-2">
			<button
				v-for="page in totalPages"
				:key="page"
				@click="emit('go-to-page', page)"
				:class="[
					'px-4 py-2 rounded-lg font-semibold transition-colors duration-200',
					currentPage === page
						? 'btn-theme text-gray-900'
						: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
				]"
			>
				{{ page }}
			</button>
		</div>

		<button
			@click="emit('go-to-page', currentPage + 1)"
			:disabled="currentPage === totalPages"
			class="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
		>
			<Fa6SolidChevronRight class="w-5 h-5" />
		</button>
	</div>
</template>
