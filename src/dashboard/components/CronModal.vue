<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { TrackedUser } from "../../stores/app.store";
import Fa6SolidXmark from "~icons/fa6-solid/xmark";
import Fa6SolidChevronDown from "~icons/fa6-solid/chevron-down";
import { useTimeFormat } from "../../utils/time";
import { useI18n } from "vue-i18n";

interface Props {
  show: boolean;
  cronUserId: string | null;
  cronInterval: number;
  editingCron: boolean;
  trackedUsers: TrackedUser[];
}

interface Emits {
  (e: "close"): void;
  (e: "save", data: { userId: string; interval: number }): void;
  (e: "update:cronUserId", value: string | null): void;
  (e: "update:cronInterval", value: number): void;
}

const { formatIntervalTime } = useTimeFormat();
const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const { t } = useI18n();
const localUserId = ref(props.cronUserId);
const localInterval = ref(props.cronInterval);
const dropdownOpen = ref(false);

const selectedUser = computed(() => {
  return props.trackedUsers.find((u) => u.userId === localUserId.value);
});

watch(
  () => props.cronUserId,
  (newVal) => {
    localUserId.value = newVal;
  },
);

watch(
  () => props.cronInterval,
  (newVal) => {
    localInterval.value = newVal;
  },
);

watch(localUserId, (newVal) => {
  emit("update:cronUserId", newVal);
});

watch(localInterval, (newVal) => {
  emit("update:cronInterval", newVal);
});

const intervalError = computed(() => {
  if (!localInterval.value)
    return t("dashboard.main.cronjob.interval_required");
  if (localInterval.value < 1)
    return t("dashboard.main.cronjob.interval_min_er");
  if (localInterval.value > 168)
    return t("dashboard.main.cronjob.interval_max_er");
  return null;
});

const isValid = computed(
  () => !intervalError.value && localUserId.value !== null,
);

const handleSave = () => {
  if (!isValid.value) {
    alert(
      intervalError.value || t("dashboard.main.cronjob.select_user_er"),
    );
    return;
  }
  emit("save", { userId: localUserId.value!, interval: localInterval.value });
};

const selectUser = (userId: string) => {
  localUserId.value = userId;
  dropdownOpen.value = false;
};
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50 p-4"
    @click.self="emit('close')"
  >
    <div class="card rounded-lg shadow-xl max-w-md w-full p-6">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-bold">
          {{
            editingCron
              ? t("dashboard.main.cronjob.edit_schedule")
              : t("dashboard.main.cronjob.add_schedule")
          }}
        </h3>
        <button
          @click="emit('close')"
          class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
        >
          <Fa6SolidXmark class="text-xl" />
        </button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-lighter mb-2">
            {{ t("dashboard.main.cronjob.select_user") }}
          </label>
          <div class="relative">
            <button
              type="button"
              @click="dropdownOpen = !dropdownOpen"
              :disabled="editingCron"
              class="input-theme rounded-lg px-3 py-2 border w-full text-left flex items-center justify-between"
            >
              <span v-if="selectedUser">
                {{ selectedUser.full_name || selectedUser.username }} (@{{
                  selectedUser.username
                }})
              </span>
              <span v-else class="text-gray-400">{{
                t("dashboard.main.cronjob.select_user")
              }}</span>
              <Fa6SolidChevronDown
                class="text-sm transition-transform duration-200"
                :class="{ 'rotate-180': dropdownOpen }"
              />
            </button>

            <div
              v-if="dropdownOpen && !editingCron"
              class="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 translate-y-1 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            >
              <div
                v-for="user in trackedUsers"
                :key="user.userId"
                @click="selectUser(user.userId)"
                class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors duration-150"
                :class="{
                  'bg-emerald-50 dark:bg-emerald-900/20':
                    user.userId === localUserId,
                }"
              >
                {{ user.full_name || user.username }} (@{{ user.username }})
              </div>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-lighter mb-2">
            {{ t("dashboard.main.cronjob.interval_w_unit") }}
          </label>
          <input
            v-model.number="localInterval"
            type="number"
            min="1"
            max="168"
            class="input-theme rounded-lg px-3 py-2 border"
            placeholder="Enter interval in hours"
          />
          <div class="text-lighter flex flex-col gap-1 mt-1">
            <p class="mt-1 text-xs">
              {{ t("dashboard.main.cronjob.interval_rec") }}
            </p>
            <p>{{ t("dashboard.main.cronjob.interval_max") }}</p>
          </div>
          <p v-if="intervalError" class="mt-1 text-xs text-red-600">
            {{ intervalError }}
          </p>
        </div>

        <div
          class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
        >
          <p class="text-sm text-blue-800 dark:text-blue-200">
            <b>Note: </b
            >{{
              t("dashboard.main.cronjob.interval_note", {
                time: formatIntervalTime(localInterval),
              })
            }}
          </p>
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button
          @click="emit('close')"
          class="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 font-medium cursor-pointer"
        >
          Cancel
        </button>
        <button
          @click="handleSave"
          class="flex-1 px-4 py-2 theme-btn rounded-lg transition-colors duration-200 font-semibold cursor-pointer"
        >
          Save
        </button>
      </div>
    </div>
  </div>
</template>
