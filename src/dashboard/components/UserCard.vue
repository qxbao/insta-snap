<script setup lang="ts">
import type { TrackedUser } from "../../stores/app.store";
import Fa6SolidArrowUpRightFromSquare from "~icons/fa6-solid/arrow-up-right-from-square";
import Fa6SolidMagnifyingGlassChart from "~icons/fa6-solid/magnifying-glass-chart";
import Fa6SolidTrashCan from "~icons/fa6-solid/trash-can";

interface Props {
	user: TrackedUser;
}

interface Emits {
	(e: "view-details", userId: string): void;
	(e: "open-profile", username: string): void;
	(e: "delete", userId: string): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const formatDate = (timestamp: number | null) => {
	if (!timestamp) return "Never";
	return new Date(timestamp).toLocaleString();
};

const formatRelativeTime = (timestamp: number | null) => {
	if (!timestamp) return "Never";
	const now = Date.now();
	const diff = now - timestamp;

	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	return `${days}d ago`;
};
</script>

<template>
	<div class="card hover:shadow-lg transition-shadow duration-200">
		<div class="relative flex items-center gap-4">
			<div
				class="absolute top-0 right-0 p-2 duration-300 text-red-500 cursor-pointer hover:text-red-800"
				@click="emit('delete', user.userId)"
			>
				<Fa6SolidTrashCan class="text-base" />
			</div>
			<img
				:src="user.profile_pic_url || '/images/user_avatar.png'"
				:alt="user.username"
				referrerpolicy="no-referrer"
				class="w-16 h-16 rounded-full object-cover border-2 border-emerald-500"
				@error="
					(e) =>
						((e.target as HTMLImageElement).src = '/images/user_avatar.png')
				"
			/>
			<div class="flex-1 min-w-0">
				<h3
					class="text-lg font-semibold text-gray-900 dark:text-white truncate"
				>
					{{ user.full_name || user.username }}
				</h3>
				<p class="text-sm text-gray-600 dark:text-gray-400 truncate">
					@{{ user.username }}
				</p>
			</div>
		</div>

		<div class="mt-6 grid grid-cols-2 gap-4">
			<div class="border-2 border-gray-700 rounded-lg p-3">
				<p class="text-xs text-gray-600 dark:text-gray-400">Snapshots</p>
				<p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
					{{ user.snapshotCount }}
				</p>
			</div>
			<div class="border-2 border-gray-700 rounded-lg p-3">
				<p class="text-xs text-gray-600 dark:text-gray-400">Last Snapshot</p>
				<p class="text-sm font-semibold text-gray-900 dark:text-white">
					{{ formatRelativeTime(user.lastSnapshot) }}
				</p>
			</div>
		</div>

		<div class="mt-4 text-xs text-gray-500 dark:text-gray-400">
			<span>Updated: {{ formatDate(user.lastSnapshot) }}</span>
		</div>

		<div class="mt-4 flex gap-2">
			<button
				@click="emit('view-details', user.userId)"
				class="flex justify-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 text-gray-900 font-semibold flex-1 transition-colors duration-200 text-sm cursor-pointer"
			>
				<Fa6SolidMagnifyingGlassChart />
				View Details
			</button>
			<button
				@click="emit('open-profile', user.username)"
				class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer hover:brightness-95 active:scale-95 duration-200 text-sm font-medium"
			>
				<Fa6SolidArrowUpRightFromSquare />
			</button>
		</div>
	</div>
</template>
