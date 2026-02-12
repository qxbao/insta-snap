import { ref } from "vue";
import { database } from "./database";
import { createLogger } from "./logger";
import { useModalStore } from "../stores/modal.store";
import AnalysisContent from "../dashboard/components/AnalysisContent.vue";

const logger = createLogger("useAnalysis");

interface AnalysisResult {
	followersNotFollowedBack: string[];
	followingNotFollowingBack: string[];
	userMap: Record<string, UserMetadata>;
}

export function useAnalysis() {
	const result = ref<AnalysisResult | null>(null);
	const modalStore = useModalStore();

	const analyzeSnapshot = async (userId: string, upToTimestamp: number) => {
		modalStore.setLoading(true);
		result.value = null;

		modalStore.openModal(
			AnalysisContent,
			{
				loading: true,
				followersNotFollowedBack: [],
				followingNotFollowingBack: [],
				userMap: {},
				timestamp: upToTimestamp,
				maxWidth: "max-w-4xl",
			},
			null,
			null,
		);

		try {
			const followersSet = await database.getFullList(
				userId,
				upToTimestamp,
				true,
			);
			const followingSet = await database.getFullList(
				userId,
				upToTimestamp,
				false,
			);

			const followersNotFollowedBack: string[] = [];
			const followingNotFollowingBack: string[] = [];

			followersSet.forEach((followerId) => {
				if (!followingSet.has(followerId)) {
					followersNotFollowedBack.push(followerId);
				}
			});

			followingSet.forEach((followingId) => {
				if (!followersSet.has(followingId)) {
					followingNotFollowingBack.push(followingId);
				}
			});

			const allUserIds = new Set([
				...followersNotFollowedBack,
				...followingNotFollowingBack,
			]);

			const users = await database.userMetadata
				.where("id")
				.anyOf(Array.from(allUserIds))
				.toArray();

			const userMap: Record<string, UserMetadata> = users.reduce(
				(acc, user) => {
					acc[user.id] = user;
					return acc;
				},
				{} as Record<string, UserMetadata>,
			);

			result.value = {
				followersNotFollowedBack,
				followingNotFollowingBack,
				userMap,
			};

			modalStore.openModal(
				AnalysisContent,
				{
					loading: false,
					followersNotFollowedBack,
					followingNotFollowingBack,
					userMap,
					timestamp: upToTimestamp,
					maxWidth: "max-w-4xl",
				},
				null,
				null,
			);
		} catch (err) {
			logger.error("Failed to analyze snapshot:", err);
			modalStore.closeModal();
			throw err;
		} finally {
			modalStore.setLoading(false);
		}
	};

	return {
		loading: modalStore.isLoading,
		result,
		analyzeSnapshot,
	};
}
