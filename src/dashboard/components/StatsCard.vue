<script setup lang="ts">
import type { TrackedUser } from "../../stores/app.store";

interface Props {
	trackedUsers: TrackedUser[];
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
					Tracked Users
				</p>
			</div>
			<div class="text-center">
				<p class="text-3xl font-bold text-blue-600 dark:text-blue-400">
					{{ trackedUsers.reduce((sum, u) => sum + u.snapshotCount, 0) }}
				</p>
				<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
					Total Snapshots
				</p>
			</div>
			<div class="text-center">
				<p class="text-3xl font-bold text-purple-600 dark:text-purple-400">
					{{
						trackedUsers.filter(
							(u) => u.lastSnapshot && Date.now() - u.lastSnapshot < 86400000,
						).length
					}}
				</p>
				<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
					Active Today
				</p>
			</div>
		</div>
	</div>
</template>
