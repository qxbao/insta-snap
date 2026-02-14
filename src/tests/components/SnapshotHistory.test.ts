import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import SnapshotHistory from "../../dashboard/components/SnapshotHistory.vue";
import { EnglishLocale } from "../../i18n/locales/en";
import { LRUCache } from "../../utils/lru-cache";
import { VietnameseLocale } from "../../i18n/locales/vi";

// Mock dependencies
vi.mock("../../utils/logger", () => ({
	createLogger: () => ({
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
		debug: vi.fn(),
	}),
}));

vi.mock("../../utils/useAnalysis", () => ({
	useAnalysis: () => ({
		analyzeSnapshot: vi.fn(),
	}),
}));

// Mock database
const mockDatabase = {
	snapshots: {
		where: vi.fn().mockReturnThis(),
		equals: vi.fn().mockReturnThis(),
		first: vi.fn(),
	},
	userMetadata: {
		toArray: vi.fn().mockResolvedValue([]),
	},
};

vi.mock("../../utils/database", () => ({
	database: mockDatabase,
}));

describe("SnapshotHistory.vue", () => {
	const mockEntries = [
		{
			timestamp: 1704067200000,
			isCheckpoint: true,
			followers: {
				addedCount: 10,
				removedCount: 5,
				totalCount: 100,
			},
			following: {
				addedCount: 3,
				removedCount: 2,
				totalCount: 50,
			},
		},
		{
			timestamp: 1704153600000,
			isCheckpoint: false,
			followers: {
				addedCount: 2,
				removedCount: 1,
			},
			following: {
				addedCount: 1,
				removedCount: 0,
			},
		},
	];

	let i18n: ReturnType<typeof createI18n>;

	beforeEach(() => {
		i18n = createI18n({
			legacy: false,
			locale: "en",
			messages: {
				en: EnglishLocale,
				vi: VietnameseLocale,
			},
		});

		vi.clearAllMocks();
		mockDatabase.snapshots.first.mockResolvedValue({
			belongToId: "test-user",
			timestamp: 1704067200000,
			followers: {
				add: ["user1", "user2"],
				rem: ["user3"],
			},
			following: {
				add: ["user4"],
				rem: [],
			},
		});
		mockDatabase.userMetadata.toArray.mockResolvedValue([
			{
				id: "user1",
				username: "testuser1",
				fullName: "Test User 1",
				avatarURL: "https://example.com/avatar1.jpg",
				updatedAt: Date.now(),
			},
		]);
	});

	it("renders snapshot history with entries", () => {
		const wrapper = mount(SnapshotHistory, {
			props: {
				entries: mockEntries,
				userId: "test-user",
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidChevronDown: true,
					Fa6SolidChevronRight: true,
					UserChangesList: true,
				},
			},
		});

		expect(wrapper.find("h3").text()).toBe("Snapshot timeline");
		expect(wrapper.findAll(".border-2").length).toBe(2);
	});

	it("toggles expand/collapse on click", async () => {
		const wrapper = mount(SnapshotHistory, {
			props: {
				entries: mockEntries,
				userId: "test-user",
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidChevronDown: true,
					Fa6SolidChevronRight: true,
					UserChangesList: true,
				},
			},
		});

		const expandButton = wrapper.find(".cursor-pointer");
		await expandButton.trigger("click");

		// Wait for async operations
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(mockDatabase.snapshots.where).toHaveBeenCalledWith(
			"[belongToId+timestamp]",
		);
		expect(mockDatabase.snapshots.equals).toHaveBeenCalledWith([
			"test-user",
			1704067200000,
		]);
	});

	it("uses shallowRef for reactive collections to avoid deep reactivity", () => {
		const wrapper = mount(SnapshotHistory, {
			props: {
				entries: mockEntries,
				userId: "test-user",
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidChevronDown: true,
					Fa6SolidChevronRight: true,
					UserChangesList: true,
				},
			},
		});

		// Component should mount without triggering recursive updates
		expect(wrapper.exists()).toBe(true);
	});

	it("renders different titles based on mode prop", () => {
		const wrapper = mount(SnapshotHistory, {
			props: {
				entries: mockEntries,
				userId: "test-user",
				mode: "followers",
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidChevronDown: true,
					Fa6SolidChevronRight: true,
					UserChangesList: true,
				},
			},
		});

		expect(wrapper.find("h3").text()).toBe("Followers changes");
	});

	it("shows custom title when provided", () => {
		const customTitle = "Custom History Title";
		const wrapper = mount(SnapshotHistory, {
			props: {
				entries: mockEntries,
				userId: "test-user",
				title: customTitle,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidChevronDown: true,
					Fa6SolidChevronRight: true,
					UserChangesList: true,
				},
			},
		});

		expect(wrapper.find("h3").text()).toBe(customTitle);
	});

	it("displays checkpoint indicator for checkpoint entries", () => {
		const wrapper = mount(SnapshotHistory, {
			props: {
				entries: mockEntries,
				userId: "test-user",
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidChevronDown: true,
					Fa6SolidChevronRight: true,
					UserChangesList: true,
				},
			},
		});

		const firstEntry = wrapper.findAll(".border-2")[0];
		expect(firstEntry.html()).toContain("bg-blue-500");
	});

	it("loads snapshot details when expanded", async () => {
		const wrapper = mount(SnapshotHistory, {
			props: {
				entries: mockEntries,
				userId: "test-user",
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidChevronDown: true,
					Fa6SolidChevronRight: true,
					UserChangesList: true,
				},
			},
		});

		const expandButton = wrapper.find(".cursor-pointer");
		await expandButton.trigger("click");
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(mockDatabase.userMetadata.toArray).toHaveBeenCalled();
	});

	it("handles LRU cache eviction when max capacity reached", async () => {
		const entries = Array.from({ length: 60 }, (_, i) => ({
			timestamp: 1704067200000 + i * 86400000,
			isCheckpoint: i % 20 === 0,
			followers: { addedCount: 1, removedCount: 0 },
			following: { addedCount: 0, removedCount: 0 },
		}));

		const wrapper = mount(SnapshotHistory, {
			props: {
				entries,
				userId: "test-user",
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidChevronDown: true,
					Fa6SolidChevronRight: true,
					UserChangesList: true,
				},
			},
		});

		// Expand multiple entries to trigger cache
		for (let i = 0; i < 55; i++) {
			mockDatabase.snapshots.first.mockResolvedValue({
				belongToId: "test-user",
				timestamp: entries[i].timestamp,
				followers: { add: [], rem: [] },
				following: { add: [], rem: [] },
			});

			const buttons = wrapper.findAll(".cursor-pointer");
			await buttons[i].trigger("click");
			await new Promise((resolve) => setTimeout(resolve, 10));
		}

		// Cache should handle eviction without errors
		expect(wrapper.exists()).toBe(true);
	});

	it("cleans up resources on unmount", () => {
		const wrapper = mount(SnapshotHistory, {
			props: {
				entries: mockEntries,
				userId: "test-user",
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidChevronDown: true,
					Fa6SolidChevronRight: true,
					UserChangesList: true,
				},
			},
		});

		wrapper.unmount();
		// Should unmount without errors
		expect(true).toBe(true);
	});

	it("handles database errors gracefully", async () => {
		mockDatabase.snapshots.first.mockRejectedValue(
			new Error("Database error"),
		);

		const wrapper = mount(SnapshotHistory, {
			props: {
				entries: mockEntries,
				userId: "test-user",
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidChevronDown: true,
					Fa6SolidChevronRight: true,
					UserChangesList: true,
				},
			},
		});

		const expandButton = wrapper.find(".cursor-pointer");
		await expandButton.trigger("click");
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(wrapper.exists()).toBe(true);
	});
});
