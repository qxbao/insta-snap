<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { TrackedUser } from "../../stores/app.store";

interface Props {
	trackedUsers: TrackedUser[];
	t: ReturnType<typeof useI18n>["t"];
}

defineProps<Props>();
</script>

<template>
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
					{{
						trackedUsers.filter(
							(u) => u.lastSnapshot && Date.now() - u.lastSnapshot < 24 * 60 * 60 * 1000,
						).length
					}}
				</p>
				<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
					{{ t("dashboard.main.heading.active_today") }}
				</p>
			</div>
		</div>
	</div>
</template>
