<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { use, init, type EChartsType } from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";

use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

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
const chartRef = ref<HTMLDivElement>();
let chartInstance: EChartsType | null = null;

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

const chartData = computed(() => {
  const reversedTimeline = [...props.timeline].reverse();
  const series = [];

  if (props.mode === "overview" || props.mode === "followers") {
    const followersTotals = calculateRunningTotals(reversedTimeline.map((e) => e.followers));
    series.push({
      name: t("dashboard.details.chart.followers_label"),
      data: followersTotals,
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: {
        width: 2,
      },
      areaStyle: {
        opacity: 0.15,
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: "#F98A76" },
            { offset: 1, color: "rgba(249, 138, 118, 0.1)" },
          ],
        },
      },
      itemStyle: {
        color: "#F98A76",
      },
    });
  }

  if (props.mode === "overview" || props.mode === "following") {
    const followingTotals = calculateRunningTotals(reversedTimeline.map((e) => e.following));
    series.push({
      name: t("dashboard.details.chart.following_label"),
      data: followingTotals,
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: {
        width: 2,
      },
      areaStyle: {
        opacity: 0.15,
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: "#207878" },
            { offset: 1, color: "rgba(32, 120, 120, 0.1)" },
          ],
        },
      },
      itemStyle: {
        color: "#207878",
      },
    });
  }

  return series;
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

const chartOption = computed<EChartsOption>(() => {
  const allValues = chartData.value.flatMap((series) => series.data as number[]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue;
  const paddingRatio = 0.12;
  const padding = range * paddingRatio;

  return {
    backgroundColor: "transparent",
    grid: {
      left: "5%",
      right: "5%",
      top: chartData.value.length > 1 ? "15%" : "10%",
      bottom: "15%",
      containLabel: true,
    },
    legend: {
      show: chartData.value.length > 1,
      top: 10,
      textStyle: {
        color: "#6b7280",
        fontSize: 14,
        fontFamily: "inherit",
      },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(31, 41, 55, 0.95)",
      borderColor: "#374151",
      borderWidth: 1,
      borderRadius: 8,
      textStyle: {
        color: "#f9fafb",
        fontSize: 13,
        fontFamily: "inherit",
      },
      axisPointer: {
        type: "line",
        lineStyle: {
          color: "rgba(107, 114, 128, 0.4)",
          width: 1,
          type: "solid",
        },
      },
    },
    xAxis: {
      type: "category",
      data: chartLabels.value,
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: "rgba(107, 114, 128, 0.4)",
        },
      },
      axisLabel: {
        color: "#a8adb5",
        fontSize: 12,
        fontFamily: "inherit",
        rotate: 0,
        margin: 15,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        show: false,
      },
    },
    yAxis: {
      type: "value",
      min: Math.floor(minValue - padding),
      max: Math.ceil(maxValue + padding),
      splitNumber: 5,
      axisLine: {
        show: true,
        lineStyle: {
          color: "rgba(107, 114, 128, 0.4)",
        },
      },
      axisLabel: {
        color: "#a8adb5",
        fontSize: 13,
        fontFamily: "inherit",
      },
      splitLine: {
        show: false,
      },
    },
    series: chartData.value.map((series) => ({
      name: series.name,
      data: series.data,
      type: "line" as const,
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: {
        width: 2,
      },
      areaStyle: {
        opacity: 0.3,
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: series.itemStyle.color },
            { offset: 1, color: "transparent" },
          ],
        },
      },
      itemStyle: {
        color: series.itemStyle.color,
      },
    })),
  };
});

const initChart = () => {
  if (!chartRef.value) return;

  if (chartInstance) {
    chartInstance.dispose();
  }

  chartInstance = init(chartRef.value);
  chartInstance?.setOption(chartOption.value);

  const handleResize = () => {
    chartInstance?.resize();
  };

  window.addEventListener("resize", handleResize);

  return () => {
    window.removeEventListener("resize", handleResize);
    chartInstance?.dispose();
    chartInstance = null;
  };
};

watch(
  () => [props.timeline, props.mode],
  () => {
    if (chartInstance && props.timeline.length > 0) {
      chartInstance.setOption(chartOption.value);
    }
  },
  { deep: true },
);

onMounted(() => {
  if (props.timeline.length > 0) {
    initChart();
  }
});

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
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
      <div ref="chartRef" class="chart-wrapper"></div>
    </div>
  </div>
</template>

<style scoped>
.user-activity-chart {
  width: 100%;
  margin: 0 auto;
}

.chart-container {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.chart-wrapper {
  width: 100%;
  height: 420px;
}

.empty-state {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%);
  border-radius: 12px;
  padding: 16px;
}
</style>
