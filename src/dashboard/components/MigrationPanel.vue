<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import Fa6SolidDatabase from "~icons/fa6-solid/database";
import Fa6SolidSpinner from "~icons/fa6-solid/spinner";
import Fa6SolidCheck from "~icons/fa6-solid/check";
import Fa6SolidXmark from "~icons/fa6-solid/xmark";
import { createLogger } from "../../utils/logger";

const { t } = useI18n();
const logger = createLogger("MigrationPanel");

const migrating = ref(false);
const migrationComplete = ref(false);
const needsMig = ref(false);
const checking = ref(true);
const migrationStats = ref<{
	usersMetadata: number;
	snapshots: number;
	crons: number;
	errors: string[];
} | null>(null);

onMounted(async () => {
	await checkMigrationNeeded();
});

const checkMigrationNeeded = async () => {
	checking.value = true;
	try {
		const { needsMigration } = await import("../../utils/migrate");
		needsMig.value = await needsMigration();
	} catch (error) {
		logger.error("Failed to check migration status:", error);
	} finally {
		checking.value = false;
	}
};

const runMigration = async () => {
	migrating.value = true;
	migrationComplete.value = false;
	migrationStats.value = null;

	try {
		const { runMigrationWithCleanup } = await import("../../utils/migrate");
		const stats = await runMigrationWithCleanup();
		migrationStats.value = stats;
		migrationComplete.value = true;
		needsMig.value = false;
		logger.info("Migration completed:", stats);
	} catch (error) {
		logger.error("Migration failed:", error);
		migrationStats.value = {
			usersMetadata: 0,
			snapshots: 0,
			crons: 0,
			errors: [String(error)],
		};
	} finally {
		migrating.value = false;
	}
};
</script>

<template>
	<div v-if="checking || needsMig || migrationComplete" class="card mb-6">
		<div class="flex items-start gap-4">
			<div
				class="shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
				:class="
					migrationComplete
						? 'bg-green-100 dark:bg-green-900'
						: 'bg-blue-100 dark:bg-blue-900'
				"
			>
				<Fa6SolidSpinner
					v-if="checking || migrating"
					class="text-blue-600 dark:text-blue-400 animate-spin"
				/>
				<Fa6SolidCheck
					v-else-if="migrationComplete"
					class="text-green-600 dark:text-green-400"
				/>
				<Fa6SolidDatabase v-else class="text-blue-600 dark:text-blue-400" />
			</div>

			<div class="flex-1">
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
					{{
						checking
							? t("dashboard.main.migration.checking")
							: migrationComplete
								? t("dashboard.main.migration.title_complete")
								: t("dashboard.main.migration.title_available")
					}}
				</h3>

				<div v-if="checking" class="text-sm text-gray-600 dark:text-gray-400">
					{{ t("dashboard.main.migration.checking_message") }}
				</div>

				<div v-else-if="needsMig && !migrationComplete" class="space-y-3">
					<p class="text-sm text-gray-600 dark:text-gray-400">
						{{ t("dashboard.main.migration.description") }}
					</p>
					<button
						@click="runMigration"
						:disabled="migrating"
						class="px-4 py-2 theme-btn rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
					>
						<Fa6SolidSpinner v-if="migrating" class="animate-spin" />
						<Fa6SolidDatabase v-else />
						{{
							migrating
								? t("dashboard.main.migration.migrating_button")
								: t("dashboard.main.migration.start_button")
						}}
					</button>
				</div>

				<div v-else-if="migrationComplete && migrationStats" class="space-y-2">
					<div v-if="migrationStats.errors.length === 0">
						<p class="text-sm text-green-600 dark:text-green-400 mb-2">
							✓ {{ t("dashboard.main.migration.success") }}
						</p>
						<div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
							<p>
								•
								{{
									t("dashboard.main.migration.stats.users", {
										count: migrationStats.usersMetadata,
									})
								}}
							</p>
							<p>
								•
								{{
									t("dashboard.main.migration.stats.snapshots", {
										count: migrationStats.snapshots,
									})
								}}
							</p>
							<p>
								•
								{{
									t("dashboard.main.migration.stats.crons", {
										count: migrationStats.crons,
									})
								}}
							</p>
						</div>
					</div>
					<div v-else>
						<p class="text-sm text-red-600 dark:text-red-400 mb-2">
							{{ t("dashboard.main.migration.errors") }}
						</p>
						<ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
							<li
								v-for="(error, idx) in migrationStats.errors"
								:key="idx"
								class="flex items-start gap-2"
							>
								<Fa6SolidXmark class="text-red-500 shrink-0 mt-0.5" />
								<span>{{ error }}</span>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
