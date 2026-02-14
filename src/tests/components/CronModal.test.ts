import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CronModal from "../../dashboard/components/CronModal.vue";
import { EnglishLocale } from "../../i18n/locales/en";

describe("CronModal.vue", () => {
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

	it("renders modal when show prop is true", () => {
		const wrapper = mount(CronModal, {
			props: {
				show: true,
				cronUserId: null,
				cronInterval: 2,
				editingCron: false,
				trackedUsers: mockTrackedUsers,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidXmark: true,
					Fa6SolidChevronDown: true,
				},
			},
		});

		expect(wrapper.find(".fixed").exists()).toBe(true);
	});

	it("does not render modal when show prop is false", () => {
		const wrapper = mount(CronModal, {
			props: {
				show: false,
				cronUserId: null,
				cronInterval: 2,
				editingCron: false,
				trackedUsers: mockTrackedUsers,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidXmark: true,
					Fa6SolidChevronDown: true,
				},
			},
		});

		expect(wrapper.find(".fixed").exists()).toBe(false);
	});

	it("displays Add Schedule title when not editing", () => {
		const wrapper = mount(CronModal, {
			props: {
				show: true,
				cronUserId: null,
				cronInterval: 2,
				editingCron: false,
				trackedUsers: mockTrackedUsers,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidXmark: true,
					Fa6SolidChevronDown: true,
				},
			},
		});

		expect(wrapper.find("h3").text()).toBe("Add schedule");
	});

	it("displays Edit Schedule title when editing", () => {
		const wrapper = mount(CronModal, {
			props: {
				show: true,
				cronUserId: "user1",
				cronInterval: 2,
				editingCron: true,
				trackedUsers: mockTrackedUsers,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidXmark: true,
					Fa6SolidChevronDown: true,
				},
			},
		});

		expect(wrapper.find("h3").text()).toBe("Edit schedule");
	});

	it("emits close event when close button clicked", async () => {
		const wrapper = mount(CronModal, {
			props: {
				show: true,
				cronUserId: null,
				cronInterval: 2,
				editingCron: false,
				trackedUsers: mockTrackedUsers,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidXmark: true,
					Fa6SolidChevronDown: true,
				},
			},
		});

		const closeButtons = wrapper.findAll("button");
		const xButton = closeButtons[0]; // X mark button
		await xButton.trigger("click");

		expect(wrapper.emitted("close")).toBeTruthy();
	});

	it("emits close event when backdrop clicked", async () => {
		const wrapper = mount(CronModal, {
			props: {
				show: true,
				cronUserId: null,
				cronInterval: 2,
				editingCron: false,
				trackedUsers: mockTrackedUsers,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidXmark: true,
					Fa6SolidChevronDown: true,
				},
			},
		});

		const backdrop = wrapper.find(".fixed");
		await backdrop.trigger("click.self");

		expect(wrapper.emitted("close")).toBeTruthy();
	});

	it("toggles dropdown when dropdown button clicked", async () => {
		const wrapper = mount(CronModal, {
			props: {
				show: true,
				cronUserId: null,
				cronInterval: 2,
				editingCron: false,
				trackedUsers: mockTrackedUsers,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidXmark: true,
					Fa6SolidChevronDown: true,
				},
			},
		});

		const dropdownButton = wrapper.find(".input-theme");
		await dropdownButton.trigger("click");

		expect(wrapper.find(".absolute.z-10").exists()).toBe(true);
	});

	it("displays user list in dropdown", async () => {
		const wrapper = mount(CronModal, {
			props: {
				show: true,
				cronUserId: null,
				cronInterval: 2,
				editingCron: false,
				trackedUsers: mockTrackedUsers,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidXmark: true,
					Fa6SolidChevronDown: true,
				},
			},
		});

		const dropdownButton = wrapper.find(".input-theme");
		await dropdownButton.trigger("click");

		const userItems = wrapper.findAll(".hover\\:bg-gray-100");
		expect(userItems.length).toBe(2);
	});

	it("selects user when user item clicked", async () => {
		const wrapper = mount(CronModal, {
			props: {
				show: true,
				cronUserId: null,
				cronInterval: 2,
				editingCron: false,
				trackedUsers: mockTrackedUsers,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidXmark: true,
					Fa6SolidChevronDown: true,
				},
			},
		});

		const dropdownButton = wrapper.find(".input-theme");
		await dropdownButton.trigger("click");

		const firstUser = wrapper.findAll(".hover\\:bg-gray-100")[0];
		await firstUser.trigger("click");

		expect(wrapper.emitted("update:cronUserId")).toBeTruthy();
		expect(wrapper.emitted("update:cronUserId")?.[0]).toEqual(["user1"]);
	});

	it("disables dropdown when editing", () => {
		const wrapper = mount(CronModal, {
			props: {
				show: true,
				cronUserId: "user1",
				cronInterval: 2,
				editingCron: true,
				trackedUsers: mockTrackedUsers,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidXmark: true,
					Fa6SolidChevronDown: true,
				},
			},
		});

		const dropdownButton = wrapper.find(".input-theme");
		expect(dropdownButton.attributes("disabled")).toBeDefined();
	});

	it("shows selected user in dropdown button", () => {
		const wrapper = mount(CronModal, {
			props: {
				show: true,
				cronUserId: "user1",
				cronInterval: 2,
				editingCron: false,
				trackedUsers: mockTrackedUsers,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidXmark: true,
					Fa6SolidChevronDown: true,
				},
			},
		});

		const dropdownButton = wrapper.find(".input-theme");
		expect(dropdownButton.text()).toContain("Test User 1");
		expect(dropdownButton.text()).toContain("@testuser1");
	});

	it("validates interval is required", async () => {
		const wrapper = mount(CronModal, {
			props: {
				show: true,
				cronUserId: "user1",
				cronInterval: 0,
				editingCron: false,
				trackedUsers: mockTrackedUsers,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidXmark: true,
					Fa6SolidChevronDown: true,
				},
			},
		});

		// Should show error text for invalid interval
		const errorText = wrapper.find(".text-red-600");
		expect(errorText.exists()).toBe(true);
		expect(errorText.text()).toContain("required");
	});

	it("validates interval minimum value", async () => {
		const wrapper = mount(CronModal, {
			props: {
				show: true,
				cronUserId: "user1",
				cronInterval: -5,
				editingCron: false,
				trackedUsers: mockTrackedUsers,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidXmark: true,
					Fa6SolidChevronDown: true,
				},
			},
		});

		// Should show error text for negative interval
		const errorText = wrapper.find(".text-red-600");
		expect(errorText.exists()).toBe(true);
		expect(errorText.text()).toContain("1 hour");
	});

	it("validates interval maximum value", () => {
		const wrapper = mount(CronModal, {
			props: {
				show: true,
				cronUserId: "user1",
				cronInterval: 200,
				editingCron: false,
				trackedUsers: mockTrackedUsers,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidXmark: true,
					Fa6SolidChevronDown: true,
				},
			},
		});

		const errorText = wrapper.find(".text-red-600");
		expect(errorText.exists()).toBe(true);
		expect(errorText.text()).toBe("Interval cannot exceed 168 hours (1 week)");
	});

	it("emits save with valid data", async () => {
		const wrapper = mount(CronModal, {
			props: {
				show: true,
				cronUserId: "user1",
				cronInterval: 4,
				editingCron: false,
				trackedUsers: mockTrackedUsers,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidXmark: true,
					Fa6SolidChevronDown: true,
				},
			},
		});

		const saveButton = wrapper.findAll("button")[wrapper.findAll("button").length - 1];
		await saveButton?.trigger("click");

		expect(wrapper.emitted("save")).toBeTruthy();
		expect(wrapper.emitted("save")?.[0]).toEqual([
			{ userId: "user1", interval: 4 },
		]);
	});

	it("emits close on cancel button click", async () => {
		const wrapper = mount(CronModal, {
			props: {
				show: true,
				cronUserId: "user1",
				cronInterval: 2,
				editingCron: false,
				trackedUsers: mockTrackedUsers,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidXmark: true,
					Fa6SolidChevronDown: true,
				},
			},
		});

		const cancelButton = wrapper.findAll("button")[wrapper.findAll("button").length - 2];
		await cancelButton?.trigger("click");

		expect(wrapper.emitted("close")).toBeTruthy();
	});

	it("updates interval via v-model", async () => {
		const wrapper = mount(CronModal, {
			props: {
				show: true,
				cronUserId: "user1",
				cronInterval: 2,
				editingCron: false,
				trackedUsers: mockTrackedUsers,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidXmark: true,
					Fa6SolidChevronDown: true,
				},
			},
		});

		const intervalInput = wrapper.find("input[type='number']");
		await intervalInput.setValue(6);

		expect(wrapper.emitted("update:cronInterval")).toBeTruthy();
	});

	it("shows interval note with formatted time", () => {
		const wrapper = mount(CronModal, {
			props: {
				show: true,
				cronUserId: "user1",
				cronInterval: 2,
				editingCron: false,
				trackedUsers: mockTrackedUsers,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidXmark: true,
					Fa6SolidChevronDown: true,
				},
			},
		});

		const noteBox = wrapper.find(".bg-blue-50");
		expect(noteBox.exists()).toBe(true);
	});

	it("highlights selected user in dropdown", async () => {
		const wrapper = mount(CronModal, {
			props: {
				show: true,
				cronUserId: "user1",
				cronInterval: 2,
				editingCron: false,
				trackedUsers: mockTrackedUsers,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidXmark: true,
					Fa6SolidChevronDown: true,
				},
			},
		});

		const dropdownButton = wrapper.find(".input-theme");
		await dropdownButton.trigger("click");

		const selectedUserItem = wrapper.find(".bg-emerald-50");
		expect(selectedUserItem.exists()).toBe(true);
	});
});
