<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import UserChangesList from "./UserChangesList.vue";
import { useModalStore } from "../../stores/modal.store";

interface Props {
  loading?: boolean;
  followersNotFollowedBack: string[];
  followingNotFollowingBack: string[];
  userMap: Record<string, UserMetadata>;
  timestamp: number;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const { t } = useI18n();
const modalStore = useModalStore();

const hasData = computed(() => {
  return props.followersNotFollowedBack.length > 0 || props.followingNotFollowingBack.length > 0;
});
</script>

<template>
  <div>
    <h3 class="text-xl font-bold mb-2">
      {{ t("dashboard.details.analysis.title") }}
    </h3>
    <p class="text-sm text-lighter mb-4">
      {{ t("dashboard.details.analysis.subtitle") }}
    </p>

    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-theme"></div>
    </div>

    <div v-else-if="!hasData" class="text-center py-8">
      <p class="text-lighter">
        {{ t("dashboard.details.analysis.no_data") }}
      </p>
    </div>

    <div v-else class="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
      <div v-if="followersNotFollowedBack.length > 0">
        <UserChangesList
          :users="followersNotFollowedBack"
          :user-map="userMap"
          :timestamp="timestamp"
          section="followers-not-followed-back"
          :title="t('dashboard.details.analysis.followers_not_followed_back')"
          color-class="green"
        />
      </div>

      <div v-if="followingNotFollowingBack.length > 0">
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

    <div class="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-lighter/20">
      <button
        @click="modalStore.closeModal()"
        class="px-4 py-2 rounded-lg font-semibold card-lighter hover:brightness-90 transition-all cursor-pointer"
      >
        {{ t("dashboard.details.analysis.close") }}
      </button>
    </div>
  </div>
</template>
