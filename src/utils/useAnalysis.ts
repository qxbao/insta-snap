import { ref } from "vue";
import { database } from "./database";
import { createLogger } from "./logger";

const logger = createLogger("useAnalysis");

interface AnalysisResult {
	followersNotFollowedBack: string[];
	followingNotFollowingBack: string[];
	userMap: Record<string, UserMetadata>;
}

export function useAnalysis() {
	const loading = ref(false);
	const result = ref<AnalysisResult | null>(null);

	const analyzeSnapshot = async (userId: string, upToTimestamp: number) => {
		loading.value = true;
		result.value = null;

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
		} catch (err) {
			logger.error("Failed to analyze snapshot:", err);
			throw err;
		} finally {
			loading.value = false;
		}
	};

	return {
		loading,
		result,
		analyzeSnapshot,
	};
}
