<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import Fa6SolidChevronDown from "~icons/fa6-solid/chevron-down";
import Fa6SolidChevronRight from "~icons/fa6-solid/chevron-right";
import { createLogger } from "../../utils/logger";
import { useTimeFormat } from "../../utils/time";
import UserChangesList from "./UserChangesList.vue";
import { LRUCache } from "../../utils/lru-cache";
import { useAnalysis } from "../../utils/useAnalysis";

interface HistoryEntry {
	timestamp: number;
	isCheckpoint: boolean;
	followers: {
		addedCount: number;
		removedCount: number;
		totalCount?: number;
	};
	following: {
		addedCount: number;
		removedCount: number;
		totalCount?: number;
	};
}

interface SnapshotData {
	followers: {
		added: string[];
		removed: string[];
	};
	following: {
		added: string[];
		removed: string[];
	};
	userMap: Record<string, UserMetadata>;
}

interface Props {
	entries: HistoryEntry[];
	userId: string;
	mode?: "both" | "followers" | "following";
	title?: string;
}

const props = withDefaults(defineProps<Props>(), {
	mode: "both",
});

const { analyzeSnapshot } = useAnalysis();
const logger = createLogger("SnapshotHistory");
const { t } = useI18n();
const expandedItems = ref<Set<number>>(new Set());
const MAX_CACHED_SNAPSHOTS = 50;
const snapshotDetails = ref(
	new LRUCache<number, SnapshotData>(MAX_CACHED_SNAPSHOTS),
);
const loadingDetails = ref<Set<number>>(new Set());

const { formatDate, formatRelativeTime } = useTimeFormat();

onBeforeUnmount(() => {
	expandedItems.value.clear();
	snapshotDetails.value.clear();
	loadingDetails.value.clear();
});

const toggleExpand = async (timestamp: number) => {
	if (expandedItems.value.has(timestamp)) {
		expandedItems.value.delete(timestamp);
	} else {
		expandedItems.value.add(timestamp);

		if (!snapshotDetails.value.has(timestamp)) {
			await loadSnapshotDetails(timestamp);
		}
	}
};

const loadSnapshotDetails = async (timestamp: number) => {
	loadingDetails.value.add(timestamp);

	try {
		const { database } = await import("../../utils/database");
		const record = await database.snapshots
			.where("[belongToId+timestamp]")
			.equals([props.userId, timestamp])
			.first();
		const allUsers = await database.userMetadata.toArray();
		const userMap: Record<string, UserMetadata> = allUsers.reduce(
			(acc, user) => {
				acc[user.id] = {
					id: user.id,
					username: user.username,
					fullName: user.fullName,
					avatarURL: user.avatarURL,
					updatedAt: user.updatedAt,
				};
				return acc;
			},
			{} as Record<string, UserMetadata>,
		);

		if (record) {
			if (snapshotDetails.value.size >= MAX_CACHED_SNAPSHOTS) {
				const firstKey = snapshotDetails.value.keys().next().value;
				if (firstKey !== undefined) {
					snapshotDetails.value.delete(firstKey);
					expandedItems.value.delete(firstKey);
				}
			}

			snapshotDetails.value.set(timestamp, {
				followers: {
					added: record.followers.add || [],
					removed: record.followers.rem || [],
				},
				following: {
					added: record.following.add || [],
					removed: record.following.rem || [],
				},
				userMap,
			});
		}
	} catch (err) {
		logger.error("Failed to load snapshot details:", err);
	} finally {
		loadingDetails.value.delete(timestamp);
	}
};

const getTitle = () => {
	if (props.title) return props.title;
	if (props.mode === "followers")
		return t("dashboard.details.history.followers_changes");
	if (props.mode === "following")
		return t("dashboard.details.history.following_changes");
	return t("dashboard.details.history.snapshot_timeline");
};

const shouldShowSection = (section: "followers" | "following") => {
	return props.mode === "both" || props.mode === section;
};
</script>

<template>
	<div>
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
			{{ getTitle() }}
		</h3>
		<div class="space-y-2">
			<div
				v-for="entry in entries"
				:key="entry.timestamp"
				class="border-2 border-lighter/40 rounded-lg overflow-hidden"
			>
				<div
					class="flex items-center justify-between p-4 cursor-pointer hover:bg-lighter/5 transition-colors"
					@click="toggleExpand(entry.timestamp)"
				>
					<div class="flex items-center gap-4 flex-1">
						<button
							class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
						>
							<Fa6SolidChevronDown
								v-if="expandedItems.has(entry.timestamp)"
								class="w-4 h-4"
							/>
							<Fa6SolidChevronRight v-else class="w-4 h-4" />
						</button>
						<div
							:class="[
								'w-3 h-3 rounded-full',
								entry.isCheckpoint ? 'bg-blue-500' : 'bg-gray-400',
							]"
						></div>
						<div>
							<p class="font-medium text-gray-900 dark:text-white">
								{{
									entry.isCheckpoint
										? t("dashboard.details.history.checkpoint")
										: t("dashboard.details.history.delta")
								}}
							</p>
							<p class="text-sm text-gray-600 dark:text-gray-400">
								{{ formatDate(entry.timestamp) }}
								<span class="text-gray-500">
									({{ formatRelativeTime(entry.timestamp) }})
								</span>
							</p>
						</div>
					</div>
					<div class="text-right">
						<p
							v-if="entry.isCheckpoint"
							class="text-sm text-gray-600 dark:text-gray-400"
						>
							<template v-if="mode === 'both'">
								{{ t("dashboard.details.history.total") }}:
								<span class="font-semibold">{{
									entry.followers.totalCount || 0
								}}</span>
								/
								<span class="font-semibold">{{
									entry.following.totalCount || 0
								}}</span>
							</template>
							<template v-else>
								{{ t("dashboard.details.history.total") }}:
								<span class="font-semibold">{{
									mode === "followers"
										? entry.followers.totalCount
										: entry.following.totalCount
								}}</span>
							</template>
						</p>
						<p v-else class="text-sm">
							<template v-if="mode === 'both'">
								<span class="text-green-600 dark:text-green-400"
									>+{{ entry.followers.addedCount }}</span
								>
								<span class="text-red-600 dark:text-red-400"
									>-{{ entry.followers.removedCount }}</span
								>
								/
								<span class="text-green-600 dark:text-green-400"
									>+{{ entry.following.addedCount }}</span
								>
								<span class="text-red-600 dark:text-red-400"
									>-{{ entry.following.removedCount }}</span
								>
							</template>
							<template v-else-if="mode === 'followers'">
								<span class="text-green-600 dark:text-green-400"
									>+{{ entry.followers.addedCount }}</span
								>
								/
								<span class="text-red-600 dark:text-red-400"
									>-{{ entry.followers.removedCount }}</span
								>
							</template>
							<template v-else>
								<span class="text-green-600 dark:text-green-400"
									>+{{ entry.following.addedCount }}</span
								>
								/
								<span class="text-red-600 dark:text-red-400"
									>-{{ entry.following.removedCount }}</span
								>
							</template>
						</p>
					</div>
					<button
						class="theme-btn font-bold px-4 py-2 rounded ms-5"
						@click.stop="analyzeSnapshot(props.userId, entry.timestamp)"
					>
						{{ t("dashboard.details.history.analyze") }}
					</button>
				</div>

				<div
					v-if="expandedItems.has(entry.timestamp)"
					class="border-t border-gray-200 dark:border-gray-600 p-4"
				>
					<div
						v-if="loadingDetails.has(entry.timestamp)"
						class="text-center py-4"
					>
						<div
							class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"
						></div>
					</div>

					<div
						v-else-if="snapshotDetails.has(entry.timestamp)"
						class="space-y-4"
					>
						<UserChangesList
							v-if="shouldShowSection('followers')"
							:users="snapshotDetails.get(entry.timestamp)!.followers.added"
							:user-map="snapshotDetails.get(entry.timestamp)!.userMap"
							:timestamp="entry.timestamp"
							section="followers-added"
							:title="t('dashboard.details.changes.new_followers')"
							color-class="green"
						/>

						<UserChangesList
							v-if="shouldShowSection('followers')"
							:users="snapshotDetails.get(entry.timestamp)!.followers.removed"
							:user-map="snapshotDetails.get(entry.timestamp)!.userMap"
							:timestamp="entry.timestamp"
							section="followers-removed"
							:title="t('dashboard.details.changes.followers_gone')"
							color-class="red"
						/>

						<UserChangesList
							v-if="shouldShowSection('following')"
							:users="snapshotDetails.get(entry.timestamp)!.following.added"
							:user-map="snapshotDetails.get(entry.timestamp)!.userMap"
							:timestamp="entry.timestamp"
							section="following-added"
							:title="t('dashboard.details.changes.new_following')"
							color-class="green"
						/>

						<UserChangesList
							v-if="shouldShowSection('following')"
							:users="snapshotDetails.get(entry.timestamp)!.following.removed"
							:user-map="snapshotDetails.get(entry.timestamp)!.userMap"
							:timestamp="entry.timestamp"
							section="following-removed"
							:title="t('dashboard.details.changes.following_gone')"
							color-class="red"
						/>

						<div
							v-if="
								snapshotDetails.get(entry.timestamp)!.followers.added.length ===
									0 &&
								snapshotDetails.get(entry.timestamp)!.followers.removed
									.length === 0 &&
								snapshotDetails.get(entry.timestamp)!.following.added.length ===
									0 &&
								snapshotDetails.get(entry.timestamp)!.following.removed
									.length === 0
							"
							class="text-center py-4 text-gray-500 dark:text-gray-400"
						>
							{{ t("dashboard.details.history.no_changes") }}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
