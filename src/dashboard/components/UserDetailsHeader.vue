<script setup lang="ts">
interface Props {
	userInfo: {
		username: string;
		full_name?: string;
		profile_pic_url: string;
	};
	userId: string;
}

interface Emits {
	(e: "open-profile"): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();
</script>

<template>
	<div class="card mb-6">
		<div class="flex items-center gap-6">
			<img
				:src="userInfo.profile_pic_url"
				:alt="userInfo.username"
				referrerpolicy="no-referrer"
				class="w-24 h-24 rounded-full object-cover border-2 border-emerald-500"
			/>
			<div class="flex-1">
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white">
					{{ userInfo.full_name || userInfo.username }}
				</h2>
				<p class="text-gray-600 dark:text-gray-400">
					@{{ userInfo.username }}
				</p>
				<button
					@click="emit('open-profile')"
					class="mt-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
				>
					View on Instagram →
				</button>
			</div>
			<div class="text-right">
				<p class="text-sm text-gray-600 dark:text-gray-400">User ID</p>
				<p class="text-lg font-mono text-gray-900 dark:text-white">
					{{ userId }}
				</p>
			</div>
		</div>
	</div>
</template>
