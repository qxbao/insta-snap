import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import StatsCard from "../../dashboard/components/StatsCard.vue";
import { EnglishLocale } from "../../i18n/locales/en";

describe("StatsCard.vue", () => {
	const mockTrackedUsers: TrackedUser[] = [
		{
			id: "user1",
			username: "testuser1",
			fullName: "Test User 1",
			avatarURL: "https://example.com/avatar1.jpg",
			snapshotCount: 5,
			lastSnapshot: Date.now(),
			updatedAt: Date.now(),
		},
		{
			id: "user2",
			username: "testuser2",
			fullName: "Test User 2",
			avatarURL: "https://example.com/avatar2.jpg",
			snapshotCount: 10,
			lastSnapshot: Date.now(),
			updatedAt: Date.now(),
		},
	];

	let i18n: ReturnType<typeof createI18n>;

	const mockT = (key: string) => {
		const messages: Record<string, string> = {
			"dashboard.main.heading.tracked_profiles": "Tracked Profiles",
			"dashboard.main.heading.total_snapshot": "Total Snapshots",
			"dashboard.main.heading.storage_used": "Storage Used",
		};
		return messages[key] || key;
	};

	beforeEach(() => {
		i18n = createI18n({
			legacy: false,
			locale: "en",
			messages: {
				en: EnglishLocale,
			},
		});

		vi.clearAllMocks();
	});

	it("renders stats card with tracked users count", () => {
		const wrapper = mount(StatsCard, {
			props: {
				trackedUsers: mockTrackedUsers,
				storageMetadata: null,
				t: mockT,
			},
			global: {
				plugins: [i18n],
			},
		});

		expect(wrapper.text()).toContain("2");
		expect(wrapper.text()).toContain("Tracked Profiles");
	});

	it("calculates total snapshot count correctly", () => {
		const wrapper = mount(StatsCard, {
			props: {
				trackedUsers: mockTrackedUsers,
				storageMetadata: null,
				t: mockT,
			},
			global: {
				plugins: [i18n],
			},
		});

		// Should sum snapshotCount: 5 + 10 = 15
		expect(wrapper.text()).toContain("15");
		expect(wrapper.text()).toContain("Total Snapshots");
	});

	it("displays storage usage placeholder when metadata is null", () => {
		const wrapper = mount(StatsCard, {
			props: {
				trackedUsers: mockTrackedUsers,
				storageMetadata: null,
				t: mockT,
			},
			global: {
				plugins: [i18n],
			},
		});

		expect(wrapper.text()).toContain("--");
		expect(wrapper.text()).toContain("Storage Used");
	});

	it("displays storage in MB when available", () => {
		const wrapper = mount(StatsCard, {
			props: {
				trackedUsers: mockTrackedUsers,
				storageMetadata: {
					usage: 1024 * 1024 * 2.5, // 2.5 MB
					quota: 1024 * 1024 * 1024,
				},
				t: mockT,
			},
			global: {
				plugins: [i18n],
			},
		});

		expect(wrapper.text()).toContain("2.50 MB");
	});

	it("formats storage in KB when less than 1 MB", () => {
		const wrapper = mount(StatsCard, {
			props: {
				trackedUsers: mockTrackedUsers,
				storageMetadata: {
					usage: 1024 * 500, // 500 KB
					quota: 1024 * 1024 * 1024,
				},
				t: mockT,
			},
			global: {
				plugins: [i18n],
			},
		});

		expect(wrapper.text()).toContain("500.0 KB");
	});

	it("displays placeholder when usage is zero", () => {
		const wrapper = mount(StatsCard, {
			props: {
				trackedUsers: mockTrackedUsers,
				storageMetadata: {
					usage: 0,
					quota: 1024 * 1024 * 1024,
				},
				t: mockT,
			},
			global: {
				plugins: [i18n],
			},
		});

		expect(wrapper.text()).toContain("--");
	});

	it("renders with empty tracked users", () => {
		const wrapper = mount(StatsCard, {
			props: {
				trackedUsers: [],
				storageMetadata: null,
				t: mockT,
			},
			global: {
				plugins: [i18n],
			},
		});

		expect(wrapper.text()).toContain("0");
		expect(wrapper.text()).toContain("Tracked Profiles");
		expect(wrapper.text()).toContain("Total Snapshots");
	});

	it("uses correct color classes for each stat", () => {
		const wrapper = mount(StatsCard, {
			props: {
				trackedUsers: mockTrackedUsers,
				storageMetadata: null,
				t: mockT,
			},
			global: {
				plugins: [i18n],
			},
		});

		const html = wrapper.html();
		expect(html).toContain("text-emerald-600");
		expect(html).toContain("text-blue-600");
		expect(html).toContain("text-purple-600");
	});

	it("has responsive grid layout", () => {
		const wrapper = mount(StatsCard, {
			props: {
				trackedUsers: mockTrackedUsers,
				storageMetadata: null,
				t: mockT,
			},
			global: {
				plugins: [i18n],
			},
		});

		expect(wrapper.find(".grid").classes()).toContain("grid-cols-1");
		expect(wrapper.find(".grid").classes()).toContain("md:grid-cols-3");
	});
});
