<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useAppStore } from "../stores/app.store";
import UserDetails from "./UserDetails.vue";
import StatsCard from "./components/StatsCard.vue";
import UserCard from "./components/UserCard.vue";
import Pagination from "./components/Pagination.vue";
import ScheduledSnapshots from "./components/ScheduledSnapshots.vue";
import CronForm from "./components/CronForm.vue";
import MigrationPanel from "./components/MigrationPanel.vue";
import Modal from "../components/Modal.vue";
import Fa6SolidRotateLeft from "~icons/fa6-solid/rotate-left";
import Fa6SolidFolderOpen from "~icons/fa6-solid/folder-open";
import { createLogger } from "../utils/logger";
import { useI18n } from "vue-i18n";
import { useModalStore } from "../stores/modal.store";

const appStore = useAppStore();
const modalStore = useModalStore();
const loading = ref(true);
const error = ref<string | null>(null);
const currentView = ref<"dashboard" | "details">("dashboard");
const selectedUserId = ref<string | null>(null);
const currentPage = ref(1);
const usersPerPage = 6;
const logger = createLogger("Dashboard");
const { t } = useI18n(); 

const trackedUsers = computed(() => appStore.trackedUsers);
const snapshotCrons = computed(() => appStore.snapshotCrons);

const totalPages = computed(() =>
	Math.ceil(trackedUsers.value.length / usersPerPage),
);
const paginatedUsers = computed(() => {
	const start = (currentPage.value - 1) * usersPerPage;
	const end = start + usersPerPage;
	return trackedUsers.value.slice(start, end);
});

onMounted(async () => {
	try {
		loading.value = true;
		await appStore.loadTrackedUsers();
		await appStore.loadSnapshotCrons();
	} catch (err) {
		if (err instanceof Error) {
			error.value = err.message;
		} else {
			error.value = "An unknown error occurred";
		}
		logger.error("Failed to load dashboard data:", err);
	} finally {
		loading.value = false;
	}
});

watch(
	() => modalStore.actionData,
	async (data) => {
		if (data && modalStore.actionId) {
			switch (modalStore.actionId) {
				case "saveCron":
					await saveCron(data);
					modalStore.closeModal();
					break;
				default:
					logger.error("Unknown modal action:", modalStore.actionId);
			}
		}
	},
	{ deep: true }
);

const openInstagramProfile = (username: string) => {
	window.open(`https://www.instagram.com/${username}`, "_blank");
};

const refreshData = async () => {
	loading.value = true;
	try {
		await appStore.refreshTrackedUsers();
		currentPage.value = 1;
	} catch (err) {
		error.value = "Failed to refresh data";
		logger.error("Failed to refresh data:", err);
	} finally {
		loading.value = false;
	}
};

const goToPage = (page: number) => {
	if (page >= 1 && page <= totalPages.value) {
		currentPage.value = page;
	}
};

const showUserDetails = (userId: string) => {
	selectedUserId.value = userId;
	currentView.value = "details";
};

const backToDashboard = () => {
	currentView.value = "dashboard";
	selectedUserId.value = null;
	refreshData();
};

const handleDeleteUserData = async (uid: string) => {
	if (
		confirm(
			t("dashboard.main.confirm.delete_snapshot"),
		)
	) {
		await appStore.deleteTrackedUser(uid);
		if (selectedUserId.value === uid && currentView.value === "details") {
			backToDashboard();
		}
	}
};

const openCronModal = (userId: string | null = null) => {
	const cronUserId = userId;
	let cronInterval = 24;
	let editingCron = false;

	if (userId) {
		const existingCron = snapshotCrons.value.find((cron) => cron.uid === userId);
		if (existingCron) {
			cronInterval = existingCron.interval;
			editingCron = true;
		}
	}

	modalStore.openModal(
		CronForm,
		{
			cronUserId,
			cronInterval,
			editingCron,
			trackedUsers: trackedUsers.value,
		},
		"saveCron",
		null
	);
};

const saveCron = async (data: { userId: string; interval: number }) => {
	try {
		await appStore.addUserSnapshotCron(data.userId, data.interval);
	} catch (err) {
		logger.error("Failed to save cron:", err);
		alert("Failed to save cron job");
	}
};

const deleteCron = async (userId: string) => {
	if (confirm(t("dashboard.main.confirm.delete_cron"))) {
		await appStore.removeUserSnapshotCron(userId);
	}
};
</script>

<template>
	<UserDetails
		v-if="currentView === 'details' && selectedUserId"
		:userId="selectedUserId"
		@back="backToDashboard"
	/>

	<div v-else id="main" class="min-h-screen">
		<header class="card mb-0 rounded-none">
			<div class="max-w-7xl mx-auto py-6">
				<div class="flex items-center justify-start">
					<div class="me-5">
						<img src="/images/icon.png?url" width="100" height="100" alt="">
					</div>
					<div>
						<h1 class="text-3xl font-bold text-theme">
							{{ t("metadata.short_name") }}
						</h1>
						<p class="mt-1 text-sm text-lighter">
							{{ t("metadata.short_desc") }}
						</p>
					</div>
					<button
						@click="refreshData"
						class="flex justify-center ms-auto gap-1 px-4 py-2 rounded theme-btn items-center cursor-pointer"
						:disabled="loading"
					>
						<Fa6SolidRotateLeft :class="{ 'animate-spin': loading }" />
						<span>
							{{ loading ? t("dashboard.main.status.refreshing") : t("dashboard.main.status.refresh") }}
						</span>
					</button>
				</div>
			</div>
		</header>

		<main
			class="max-w-7xl flex flex-col gap-10 mx-auto px-4 sm:px-6 lg:px-8 py-8"
		>
			<MigrationPanel />
			<StatsCard v-if="trackedUsers.length > 0" :tracked-users="trackedUsers" :t="t" />

			<div v-if="loading" class="flex justify-center items-center py-12">
				<div
					class="animate-spin rounded-full h-12 w-12 border-b-2 border-theme"
				></div>
			</div>

			<div
				v-else-if="error"
				class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
			>
				<p class="text-red-800 dark:text-red-200">{{ error }}</p>
			</div>

			<div v-else-if="trackedUsers.length === 0" class="card text-center py-12">
				<Fa6SolidFolderOpen class="mx-auto h-12 w-12 text-gray-400" />
				<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
					{{ t("dashboard.main.no_snapshots") }}
				</h3>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					{{ t("dashboard.main.no_snapshots_desc") }}
				</p>
			</div>

			<div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				<UserCard
					v-for="user in paginatedUsers"
					:key="user.id"
					:user="user"
					@view-details="showUserDetails"
					@open-profile="openInstagramProfile"
					@delete="handleDeleteUserData"
				/>
			</div>

			<Pagination
				v-if="trackedUsers.length > usersPerPage"
				:current-page="currentPage"
				:total-pages="totalPages"
				@go-to-page="goToPage"
			/>

			<ScheduledSnapshots
				:snapshot-crons="snapshotCrons"
				:tracked-users="trackedUsers"
				@open-cron-modal="openCronModal"
				@delete-cron="deleteCron"
			/>
		</main>

		<Modal />
	</div>
</template>

<style scoped></style>
