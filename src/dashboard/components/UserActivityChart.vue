<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { VueUiXy, VueUiXyConfig, VueUiXyDatasetItem } from "vue-data-ui";
import "vue-data-ui/style.css";

interface TimelineEntry {
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

interface Props {
	timeline: TimelineEntry[];
	mode: "overview" | "followers" | "following";
}

const props = defineProps<Props>();
const { t } = useI18n();

const calculateRunningTotals = (
	data: Array<{
		addedCount: number;
		removedCount: number;
		totalCount?: number;
	}>,
) => {
	const runningTotals: number[] = [];
	let currentTotal = 0;

	for (const entry of data) {
		if (entry.totalCount !== undefined) {
			currentTotal = entry.totalCount;
		} else {
			currentTotal += entry.addedCount - entry.removedCount;
		}
		runningTotals.push(currentTotal);
	}

	return runningTotals;
};

const chartData = computed<VueUiXyDatasetItem[]>(() => {
	const reversedTimeline = [...props.timeline].reverse();
	const result = [];

	if (props.mode === "overview" || props.mode === "followers") {
		const followersTotals = calculateRunningTotals(
			reversedTimeline.map((e) => e.followers),
		);
		result.push({
			name: t("dashboard.details.chart.followers_label"),
			series: followersTotals,
			type: "line" as const,
			useArea: true,
			color: "#F98A76",
		});
	}

	if (props.mode === "overview" || props.mode === "following") {
		const followingTotals = calculateRunningTotals(
			reversedTimeline.map((e) => e.following),
		);
		result.push({
			name: t("dashboard.details.chart.following_label"),
			series: followingTotals,
			type: "line" as const,
			useArea: true,
			color: "#207878",
		});
	}

	return result;
});

const chartLabels = computed(() => {
	const reversedTimeline = [...props.timeline].reverse();
	return reversedTimeline.map((entry) =>
		new Date(entry.timestamp).toLocaleString(window.navigator.language, {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}),
	);
});

const chartConfig = computed<VueUiXyConfig>(() => {
	const allValues = chartData.value.flatMap(
		(dataset) => dataset.series as number[],
	);
	const minValue = Math.min(...allValues);
	const maxValue = Math.max(...allValues);
	const range = maxValue - minValue;
	const padding = range * 0.12;

	return {
		chart: {
			backgroundColor: "transparent",
			fontFamily: "inherit",
			height: 420,
			padding: {
				top: 5,
				right: 5,
				bottom: 5,
				left: 5,
			},
			legend: {
				show: chartData.value.length > 1,
				fontSize: 14,
				color: "#6b7280",
			},
			grid: {
				stroke: "rgba(107, 114, 128, 0.4)",
				strokeWidth: 44,
				showVerticalLines: false,
				showHorizontalLines: false,
				position: "start",
				labels: {
					show: true,
					color: "#a8adb5",
					fontSize: 13,
					yAxis: {
						showCrosshairs: false,
						scaleMin: Math.floor(minValue - padding),
						scaleMax: Math.ceil(maxValue + padding),
						commonScaleSteps: 6,
						showBaseline: true,
					},
					xAxis: {
						showCrosshairs: false,
						showBaseline: true,
					},
					xAxisLabels: {
						show: true,
						color: "#a8adb5",
						fontSize: 12,
						values: chartLabels.value,
						yOffset: 32,
					},
				},
			},
			userOptions: {
				show: false,
			},
			tooltip: {
				show: true,
				backgroundColor: "#1f2937",
				backgroundOpacity: 95,
				color: "#f9fafb",
				borderColor: "#374151",
				borderWidth: 1,
				borderRadius: 8,
				fontSize: 13,
			},
		},
		line: {
			showTransition: true,
			strokeWidth: 2,
			useGradient: true,
			area: {
				useGradient: true,
				opacity: 15,
			},
		},
	} as VueUiXyConfig;
});
</script>

<template>
	<div class="user-activity-chart">
		<div v-if="timeline.length === 0" class="empty-state">
			<p class="text-gray-500 dark:text-gray-400 text-center py-12">
				{{ t("dashboard.details.chart.no_data") }}
			</p>
		</div>
		<div v-else class="chart-container">
			<VueUiXy :dataset="chartData" :config="chartConfig" />
		</div>
	</div>
</template>

<style scoped>
.user-activity-chart {
	width: 100%;
	margin: 0 auto;
}

.chart-container {
	background: linear-gradient(
		135deg,
		rgba(255, 255, 255, 0.02) 0%,
		rgba(255, 255, 255, 0) 100%
	);
	border-radius: 12px;
	padding: 16px;
}

.empty-state {
	min-height: 300px;
	display: flex;
	align-items: center;
	justify-content: center;
}
</style>
