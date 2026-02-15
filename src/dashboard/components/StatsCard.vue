<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { computed } from "vue";

interface Props {
	trackedUsers: TrackedUser[];
	storageMetadata: StorageEstimate | null;
	t: ReturnType<typeof useI18n>["t"];
}

const props = defineProps<Props>();

const storageUsed = computed(() => {
	if (!props.storageMetadata || !props.storageMetadata.usage) {
		return "--";
	}
	
	const usedMB = props.storageMetadata.usage / (1024 * 1024);
	
	if (usedMB < 1) {
		return `${(usedMB * 1024).toFixed(1)} KB`;
	}
	return `${usedMB.toFixed(2)} MB`;
});
</script>

<template>
	{{ 
	 }}
	<div class="card py-10">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="text-center">
				<p class="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
					{{ trackedUsers.length }}
				</p>
				<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
					{{ t("dashboard.main.heading.tracked_profiles") }}
				</p>
			</div>
			<div class="text-center">
				<p class="text-3xl font-bold text-blue-600 dark:text-blue-400">
					{{ trackedUsers.reduce((sum, u) => sum + u.snapshotCount, 0) }}
				</p>
				<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
					{{ t("dashboard.main.heading.total_snapshot") }}
				</p>
			</div>
			<div class="text-center">
				<p class="text-3xl font-bold text-purple-600 dark:text-purple-400">
					{{ storageUsed }}
				</p>
				<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
					{{ t("dashboard.main.heading.storage_used") }}
				</p>
			</div>
		</div>
	</div>
</template>
