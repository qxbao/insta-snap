<script setup lang="ts">
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import Fa6SolidXmark from "~icons/fa6-solid/xmark";
import UserChangesList from "./UserChangesList.vue";

interface Props {
	show: boolean;
	loading?: boolean;
	followersNotFollowedBack: string[];
	followingNotFollowingBack: string[];
	userMap: Record<string, UserMetadata>;
	timestamp: number;
}

const props = withDefaults(defineProps<Props>(), {
	loading: false,
});

const emit = defineEmits<{
	close: [];
}>();

const { t } = useI18n();

const hasData = computed(() => {
	return (
		props.followersNotFollowedBack.length > 0 ||
		props.followingNotFollowingBack.length > 0
	);
});

watch(
	() => props.show,
	(show) => {
		if (show) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
	},
);
</script>

<template>
	<Teleport to="body">
		<Transition name="modal">
			<div
				v-if="show"
				class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
				@click.self="emit('close')"
			>
				<div
					class="card max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-up"
				>
					<!-- Header -->
					<div
						class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700"
					>
						<div>
							<h2 class="text-2xl font-bold text-gray-900 dark:text-white">
								{{ t("dashboard.details.analysis.title") }}
							</h2>
							<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
								{{ t("dashboard.details.analysis.subtitle") }}
							</p>
						</div>
						<button
							@click="emit('close')"
							class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
						>
							<Fa6SolidXmark class="w-5 h-5 text-gray-500 dark:text-gray-400" />
						</button>
					</div>

					<!-- Content -->
					<div class="flex-1 overflow-y-auto p-6">
						<div v-if="loading" class="flex justify-center items-center py-12">
							<div
								class="animate-spin rounded-full h-12 w-12 border-b-2 border-theme"
							></div>
						</div>

						<div v-else-if="!hasData" class="text-center py-12">
							<p class="text-gray-500 dark:text-gray-400">
								{{ t("dashboard.details.analysis.no_data") }}
							</p>
						</div>

						<div v-else class="space-y-6">
							<!-- Followers not followed back -->
							<div
								v-if="followersNotFollowedBack.length > 0"
								class="card-lighter p-4 rounded-lg"
							>
								<UserChangesList
									:users="followersNotFollowedBack"
									:user-map="userMap"
									:timestamp="timestamp"
									section="followers-not-followed-back"
									:title="t('dashboard.details.analysis.followers_not_followed_back')"
									color-class="green"
								/>
							</div>

							<!-- Following not following back -->
							<div
								v-if="followingNotFollowingBack.length > 0"
								class="card-lighter p-4 rounded-lg"
							>
								<UserChangesList
									:users="followingNotFollowingBack"
									:user-map="userMap"
									:timestamp="timestamp"
									section="following-not-following-back"
									:title="t('dashboard.details.analysis.following_not_following_back')"
									color-class="red"
								/>
							</div>
						</div>
					</div>

					<div
						class="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700"
					>
						<button
							@click="emit('close')"
							class="px-4 py-2 rounded-lg font-semibold card-lighter hover:brightness-90 transition-all cursor-pointer"
						>
							{{ t("dashboard.details.analysis.close") }}
						</button>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
	transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
	opacity: 0;
}

.modal-enter-active .card,
.modal-leave-active .card {
	transition: transform 0.3s ease;
}

.modal-enter-from .card,
.modal-leave-to .card {
	transform: scale(0.95) translateY(20px);
}

@keyframes slide-up {
	from {
		opacity: 0;
		transform: translateY(20px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.animate-slide-up {
	animation: slide-up 0.3s ease-out;
}
</style>
