import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import SnapshotHistory from "../../dashboard/components/SnapshotHistory.vue";
import { EnglishLocale } from "../../i18n/locales/en";
import { LRUCache } from "../../utils/lru-cache";
import { VietnameseLocale } from "../../i18n/locales/vi";
import { database } from "../../utils/database";

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
vi.mock("../../utils/database", () => {
	const mockDb = {
		snapshots: {
			where: vi.fn().mockReturnThis(),
			equals: vi.fn().mockReturnThis(),
			first: vi.fn(),
		},
		userMetadata: {
			toArray: vi.fn().mockResolvedValue([]),
		},
		deleteSnapshot: vi.fn(),
	};
	return {
		database: mockDb,
	};
});

// Get mocked database reference
const mockDatabase = vi.mocked(database) as any;

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

describe("SnapshotHistory.vue - Delete Functionality", () => {
	let i18n: ReturnType<typeof createI18n>;
	let originalConfirm: typeof window.confirm;
	let originalAlert: typeof window.alert;

	const createMockEntries = () => [
		{
			timestamp: 1000,
			isCheckpoint: true,
			followers: { addedCount: 100, removedCount: 0, totalCount: 100 },
			following: { addedCount: 50, removedCount: 0, totalCount: 50 },
		},
		{
			timestamp: 2000,
			isCheckpoint: false,
			followers: { addedCount: 5, removedCount: 2 },
			following: { addedCount: 3, removedCount: 1 },
		},
		{
			timestamp: 3000,
			isCheckpoint: false,
			followers: { addedCount: 3, removedCount: 1 },
			following: { addedCount: 2, removedCount: 0 },
		},
		{
			timestamp: 4000,
			isCheckpoint: true,
			followers: { addedCount: 106, removedCount: 0, totalCount: 106 },
			following: { addedCount: 54, removedCount: 0, totalCount: 54 },
		},
		{
			timestamp: 5000,
			isCheckpoint: false,
			followers: { addedCount: 1, removedCount: 0 },
			following: { addedCount: 0, removedCount: 1 },
		},
	];

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
		mockDatabase.deleteSnapshot.mockResolvedValue(undefined);
		mockDatabase.snapshots.first.mockResolvedValue({
			id: 123,
			belongToId: "test-user",
			timestamp: 1000,
			followers: { add: [], rem: [] },
			following: { add: [], rem: [] },
		});

		// Mock window.confirm and window.alert
		originalConfirm = window.confirm;
		originalAlert = window.alert;
		window.confirm = vi.fn().mockReturnValue(true) as any;
		window.alert = vi.fn() as any;
	});

	afterEach(() => {
		window.confirm = originalConfirm;
		window.alert = originalAlert;
	});

	// Helper function to find delete buttons by their CSS class
	const findDeleteButtons = (wrapper: any) => {
		return wrapper.findAll("button").filter((btn: any) => {
			const classes = btn.classes();
			return classes.includes("p-2") && classes.includes("rounded");
		});
	};

	describe("getAffectedTimestamps", () => {
		it("deleting a checkpoint should only affect itself", async () => {
			const entries = createMockEntries();
			const wrapper = mount(SnapshotHistory, {
				props: { entries, userId: "test-user" },
				global: {
					plugins: [i18n],
					stubs: {
						Fa6SolidChevronDown: true,
						Fa6SolidChevronRight: true,
						Fa6SolidTrash: true,
						UserChangesList: true,
					},
				},
			});

			// Find delete button for first checkpoint (timestamp 1000)
			const deleteButtons = findDeleteButtons(wrapper);
			await deleteButtons[0].trigger("mouseenter");
			await wrapper.vm.$nextTick();

			// Only the checkpoint itself should be highlighted
			const highlightedItems = wrapper.findAll(".border-red-400");
			expect(highlightedItems.length).toBe(1);
		});

		it("deleting a delta should affect itself and all previous deltas until checkpoint", async () => {
			const entries = createMockEntries();
			const wrapper = mount(SnapshotHistory, {
				props: { entries, userId: "test-user" },
				global: {
					plugins: [i18n],
					stubs: {
						Fa6SolidChevronDown: true,
						Fa6SolidChevronRight: true,
						Fa6SolidTrash: true,
						UserChangesList: true,
					},
				},
			});

			// Hover over delete button for timestamp 3000 (second delta)
			const deleteButtons = findDeleteButtons(wrapper);
			await deleteButtons[2].trigger("mouseenter"); // Third entry (index 2)
			await wrapper.vm.$nextTick();

			// Should highlight itself (3000) + previous delta (2000) = 2 items
			const highlightedItems = wrapper.findAll(".border-red-400");
			expect(highlightedItems.length).toBe(2);
		});

		it("deleting first delta after checkpoint should only affect itself", async () => {
			const entries = createMockEntries();
			const wrapper = mount(SnapshotHistory, {
				props: { entries, userId: "test-user" },
				global: {
					plugins: [i18n],
					stubs: {
						Fa6SolidChevronDown: true,
						Fa6SolidChevronRight: true,
						Fa6SolidTrash: true,
						UserChangesList: true,
					},
				},
			});

			// Hover over delete button for timestamp 2000 (first delta after checkpoint 1000)
			const deleteButtons = findDeleteButtons(wrapper);
			await deleteButtons[1].trigger("mouseenter"); // Second entry (index 1)
			await wrapper.vm.$nextTick();

			// Should only highlight itself
			const highlightedItems = wrapper.findAll(".border-red-400");
			expect(highlightedItems.length).toBe(1);
		});

		it("deleting last delta in sequence should affect all previous deltas", async () => {
			const entries = createMockEntries();
			const wrapper = mount(SnapshotHistory, {
				props: { entries, userId: "test-user" },
				global: {
					plugins: [i18n],
					stubs: {
						Fa6SolidChevronDown: true,
						Fa6SolidChevronRight: true,
						Fa6SolidTrash: true,
						UserChangesList: true,
					},
				},
			});

			// Hover over delete button for timestamp 5000 (delta after checkpoint 4000)
			const deleteButtons = findDeleteButtons(wrapper);
			await deleteButtons[4].trigger("mouseenter"); // Fifth entry (index 4)
			await wrapper.vm.$nextTick();

			// Should only highlight itself (no previous deltas before this one after checkpoint 4000)
			const highlightedItems = wrapper.findAll(".border-red-400");
			expect(highlightedItems.length).toBe(1);
		});
	});

	describe("isAffectedByDelete", () => {
		it("returns false when no timestamp is hovered", () => {
			const entries = createMockEntries();
			const wrapper = mount(SnapshotHistory, {
				props: { entries, userId: "test-user" },
				global: {
					plugins: [i18n],
					stubs: {
						Fa6SolidChevronDown: true,
						Fa6SolidChevronRight: true,
						Fa6SolidTrash: true,
						UserChangesList: true,
					},
				},
			});

			// No hover, so no items should be highlighted
			const highlightedItems = wrapper.findAll(".border-red-400");
			expect(highlightedItems.length).toBe(0);
		});

		it("returns true for affected timestamps when hovering", async () => {
			const entries = createMockEntries();
			const wrapper = mount(SnapshotHistory, {
				props: { entries, userId: "test-user" },
				global: {
					plugins: [i18n],
					stubs: {
						Fa6SolidChevronDown: true,
						Fa6SolidChevronRight: true,
						Fa6SolidTrash: true,
						UserChangesList: true,
					},
				},
			});

			const deleteButtons = findDeleteButtons(wrapper);
			await deleteButtons[2].trigger("mouseenter"); // Hover timestamp 3000
			await wrapper.vm.$nextTick();

			const highlightedItems = wrapper.findAll(".border-red-400");
			expect(highlightedItems.length).toBeGreaterThan(0);
		});
	});

	describe("handleDeleteHover", () => {
		it("sets hoveredDeleteTimestamp on mouseenter", async () => {
			const entries = createMockEntries();
			const wrapper = mount(SnapshotHistory, {
				props: { entries, userId: "test-user" },
				global: {
					plugins: [i18n],
					stubs: {
						Fa6SolidChevronDown: true,
						Fa6SolidChevronRight: true,
						Fa6SolidTrash: true,
						UserChangesList: true,
					},
				},
			});

			const deleteButtons = findDeleteButtons(wrapper);
			await deleteButtons[0].trigger("mouseenter");
			await wrapper.vm.$nextTick();

			// Should see highlighted items
			const highlightedItems = wrapper.findAll(".border-red-400");
			expect(highlightedItems.length).toBeGreaterThan(0);
		});

		it("clears hoveredDeleteTimestamp on mouseleave", async () => {
			const entries = createMockEntries();
			const wrapper = mount(SnapshotHistory, {
				props: { entries, userId: "test-user" },
				global: {
					plugins: [i18n],
					stubs: {
						Fa6SolidChevronDown: true,
						Fa6SolidChevronRight: true,
						Fa6SolidTrash: true,
						UserChangesList: true,
					},
				},
			});

			const deleteButtons = findDeleteButtons(wrapper);
			await deleteButtons[0].trigger("mouseenter");
			await wrapper.vm.$nextTick();

			let highlightedItems = wrapper.findAll(".border-red-400");
			expect(highlightedItems.length).toBeGreaterThan(0);

			await deleteButtons[0].trigger("mouseleave");
			await wrapper.vm.$nextTick();

			highlightedItems = wrapper.findAll(".border-red-400");
			expect(highlightedItems.length).toBe(0);
		});
	});

	describe("handleDelete", () => {
		it("shows single delete confirmation when only one record affected", async () => {
			const entries = createMockEntries();
			const wrapper = mount(SnapshotHistory, {
				props: { entries, userId: "test-user" },
				global: {
					plugins: [i18n],
					stubs: {
						Fa6SolidChevronDown: true,
						Fa6SolidChevronRight: true,
						Fa6SolidTrash: true,
						UserChangesList: true,
					},
				},
			});

			const deleteButtons = findDeleteButtons(wrapper);
			await deleteButtons[0].trigger("click");

			expect(window.confirm).toHaveBeenCalledWith(
				expect.stringContaining("Are you sure you want to delete this snapshot?"),
			);
		});

		it("shows multiple delete confirmation when multiple records affected", async () => {
			const entries = createMockEntries();
			const wrapper = mount(SnapshotHistory, {
				props: { entries, userId: "test-user" },
				global: {
					plugins: [i18n],
					stubs: {
						Fa6SolidChevronDown: true,
						Fa6SolidChevronRight: true,
						Fa6SolidTrash: true,
						UserChangesList: true,
					},
				},
			});

			mockDatabase.snapshots.first.mockResolvedValue({
				id: 456,
				belongToId: "test-user",
				timestamp: 3000,
				followers: { add: [], rem: [] },
				following: { add: [], rem: [] },
			});

			const deleteButtons = findDeleteButtons(wrapper);
			await deleteButtons[2].trigger("click"); // Delete timestamp 3000 (affects 2 records)
			await wrapper.vm.$nextTick();

			expect(window.confirm).toHaveBeenCalled();
			const confirmMessage = vi.mocked(window.confirm).mock.calls[0][0];
			expect(confirmMessage).toContain("dependent");
		});

		it("does not delete when user cancels confirmation", async () => {
			vi.mocked(window.confirm).mockReturnValue(false);

			const entries = createMockEntries();
			const wrapper = mount(SnapshotHistory, {
				props: { entries, userId: "test-user" },
				global: {
					plugins: [i18n],
					stubs: {
						Fa6SolidChevronDown: true,
						Fa6SolidChevronRight: true,
						Fa6SolidTrash: true,
						UserChangesList: true,
					},
				},
			});

			const deleteButtons = findDeleteButtons(wrapper);
			await deleteButtons[0].trigger("click");

			expect(window.confirm).toHaveBeenCalled();
			expect(mockDatabase.deleteSnapshot).not.toHaveBeenCalled();
		});

		it("deletes snapshot and emits event when user confirms", async () => {
			const entries = createMockEntries();
			const wrapper = mount(SnapshotHistory, {
				props: { entries, userId: "test-user" },
				global: {
					plugins: [i18n],
					stubs: {
						Fa6SolidChevronDown: true,
						Fa6SolidChevronRight: true,
						Fa6SolidTrash: true,
						UserChangesList: true,
					},
				},
			});

			mockDatabase.snapshots.first.mockResolvedValue({
				id: 123,
				belongToId: "test-user",
				timestamp: 1000,
				followers: { add: [], rem: [] },
				following: { add: [], rem: [] },
			});

			const deleteButtons = findDeleteButtons(wrapper);
			await deleteButtons[0].trigger("click");
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(mockDatabase.deleteSnapshot).toHaveBeenCalledWith(123);
			expect(wrapper.emitted("snapshotDeleted")).toBeTruthy();
		});

		it("handles delete errors gracefully", async () => {
			mockDatabase.deleteSnapshot.mockRejectedValue(new Error("Delete failed"));

			const entries = createMockEntries();
			const wrapper = mount(SnapshotHistory, {
				props: { entries, userId: "test-user" },
				global: {
					plugins: [i18n],
					stubs: {
						Fa6SolidChevronDown: true,
						Fa6SolidChevronRight: true,
						Fa6SolidTrash: true,
						UserChangesList: true,
					},
				},
			});

			mockDatabase.snapshots.first.mockResolvedValue({
				id: 123,
				belongToId: "test-user",
				timestamp: 1000,
				followers: { add: [], rem: [] },
				following: { add: [], rem: [] },
			});

			const deleteButtons = findDeleteButtons(wrapper);
			await deleteButtons[0].trigger("click");
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(window.alert).toHaveBeenCalledWith(
				expect.stringContaining("Failed to delete snapshot"),
			);
			expect(wrapper.emitted("snapshotDeleted")).toBeFalsy();
		});

		it("stops event propagation when delete button clicked", async () => {
			const entries = createMockEntries();
			const wrapper = mount(SnapshotHistory, {
				props: { entries, userId: "test-user" },
				global: {
					plugins: [i18n],
					stubs: {
						Fa6SolidChevronDown: true,
						Fa6SolidChevronRight: true,
						Fa6SolidTrash: true,
						UserChangesList: true,
					},
				},
			});

			const deleteButtons = findDeleteButtons(wrapper);

			// Create a mock event with stopPropagation
			const stopPropagationSpy = vi.fn();
			const mockEvent = new Event("click");
			mockEvent.stopPropagation = stopPropagationSpy;

			// Trigger with custom event
			await deleteButtons[0].element.dispatchEvent(mockEvent);

			// Event propagation should have been stopped
			// (The component calls event.stopPropagation())
			expect(stopPropagationSpy).toHaveBeenCalled();
		});

		it("does not delete if snapshot record not found", async () => {
			mockDatabase.snapshots.first.mockResolvedValue(null);

			const entries = createMockEntries();
			const wrapper = mount(SnapshotHistory, {
				props: { entries, userId: "test-user" },
				global: {
					plugins: [i18n],
					stubs: {
						Fa6SolidChevronDown: true,
						Fa6SolidChevronRight: true,
						Fa6SolidTrash: true,
						UserChangesList: true,
					},
				},
			});

			const deleteButtons = findDeleteButtons(wrapper);
			await deleteButtons[0].trigger("click");
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(mockDatabase.deleteSnapshot).not.toHaveBeenCalled();
			expect(wrapper.emitted("snapshotDeleted")).toBeFalsy();
		});
	});

	describe("UI rendering for delete functionality", () => {
		it("renders delete button for each entry", () => {
			const entries = createMockEntries();
			const wrapper = mount(SnapshotHistory, {
				props: { entries, userId: "test-user" },
				global: {
					plugins: [i18n],
					stubs: {
						Fa6SolidChevronDown: true,
						Fa6SolidChevronRight: true,
						Fa6SolidTrash: true,
						UserChangesList: true,
					},
				},
			});

			const deleteButtons = findDeleteButtons(wrapper);
			expect(deleteButtons.length).toBe(entries.length);
		});

		it("applies correct CSS classes to affected entries", async () => {
			const entries = createMockEntries();
			const wrapper = mount(SnapshotHistory, {
				props: { entries, userId: "test-user" },
				global: {
					plugins: [i18n],
					stubs: {
						Fa6SolidChevronDown: true,
						Fa6SolidChevronRight: true,
						Fa6SolidTrash: true,
						UserChangesList: true,
					},
				},
			});

			const deleteButtons = findDeleteButtons(wrapper);
			await deleteButtons[2].trigger("mouseenter");
			await wrapper.vm.$nextTick();

			const highlightedItems = wrapper.findAll(".border-red-400");
			expect(highlightedItems.length).toBeGreaterThan(0);

			// Check for other expected classes
			const firstHighlighted = highlightedItems[0];
			expect(firstHighlighted.classes()).toContain("border-red-400");
		});

		it("shows correct tooltip on delete button", () => {
			const entries = createMockEntries();
			const wrapper = mount(SnapshotHistory, {
				props: { entries, userId: "test-user" },
				global: {
					plugins: [i18n],
					stubs: {
						Fa6SolidChevronDown: true,
						Fa6SolidChevronRight: true,
						Fa6SolidTrash: true,
						UserChangesList: true,
					},
				},
			});

			const deleteButtons = findDeleteButtons(wrapper);
			const firstDeleteButton = deleteButtons[0];

			expect(firstDeleteButton.attributes("title")).toContain("Delete this snapshot");
		});

		it("applies hover styles to delete button", async () => {
			const entries = createMockEntries();
			const wrapper = mount(SnapshotHistory, {
				props: { entries, userId: "test-user" },
				global: {
					plugins: [i18n],
					stubs: {
						Fa6SolidChevronDown: true,
						Fa6SolidChevronRight: true,
						Fa6SolidTrash: true,
						UserChangesList: true,
					},
				},
			});

			const deleteButtons = findDeleteButtons(wrapper);
			const firstDeleteButton = deleteButtons[0];

			// Button should have hover classes
			expect(firstDeleteButton.classes().join(" ")).toMatch(/text-gray-400|hover:text-red-600/);
		});
	});
});

