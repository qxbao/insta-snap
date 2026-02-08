<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface Props {
	totalSnapshots: number;
	checkpointCount: number;
	currentFollowersCount: number;
	currentFollowingCount: number;
}

defineProps<Props>();
const { t } = useI18n();
</script>

<template>
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
		<div class="card text-center">
			<p class="text-sm text-gray-600 dark:text-gray-400">
				{{ t("dashboard.details.stats.total_snapshots") }}
			</p>
			<p class="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
				{{ totalSnapshots }}
			</p>
		</div>
		<div class="card text-center">
			<p class="text-sm text-gray-600 dark:text-gray-400">
				{{ t("dashboard.details.stats.checkpoints") }}
			</p>
			<p class="text-3xl font-bold text-blue-600 dark:text-blue-400">
				{{ checkpointCount }}
			</p>
		</div>
		<div class="card text-center">
			<p class="text-sm text-gray-600 dark:text-gray-400">
				{{ t("dashboard.details.stats.current_followers") }}
			</p>
			<p class="text-3xl font-bold text-purple-600 dark:text-purple-400">
				{{ currentFollowersCount }}
			</p>
		</div>
		<div class="card text-center">
			<p class="text-sm text-gray-600 dark:text-gray-400">
				{{ t("dashboard.details.stats.current_following") }}
			</p>
			<p class="text-3xl font-bold text-pink-600 dark:text-pink-400">
				{{ currentFollowingCount }}
			</p>
		</div>
	</div>
</template>
