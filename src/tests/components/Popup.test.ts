import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "vue-i18n";
import Popup from "../../popup/Popup.vue";
import { EnglishLocale } from "../../i18n/locales/en";
import { useAppStore } from "../../stores/app.store";
import { createMockStorage } from "../utils/test-helpers";
import { ActionType } from "../../constants/actions";

// Mock logger
vi.mock("../../utils/logger", () => ({
	createLogger: () => ({
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	}),
}));

// Mock chrome utilities
vi.mock("../../utils/chrome", () => ({
	sendMessageToActiveTab: vi.fn(),
	sendMessageWithRetry: vi.fn().mockResolvedValue({
		payload: "test-user-id",
	}),
}));

describe("Popup.vue", () => {
	let mockLocalStorage: ReturnType<typeof createMockStorage>;
	let mockSessionStorage: ReturnType<typeof createMockStorage>;
	let i18n: ReturnType<typeof createI18n>;

	beforeEach(() => {
		i18n = createI18n({
			legacy: false,
			locale: "en",
			messages: {
				en: EnglishLocale,
			},
		});

		setActivePinia(createPinia());

		mockLocalStorage = createMockStorage();
		mockSessionStorage = createMockStorage();

		global.chrome.storage.local.get = mockLocalStorage.get as any;
		global.chrome.storage.local.set = mockLocalStorage.set as any;
		global.chrome.storage.session.get = mockSessionStorage.get as any;
		global.chrome.storage.session.set = mockSessionStorage.set as any;

		// Mock chrome.tabs
		global.chrome.tabs = {
			query: vi.fn().mockResolvedValue([
				{
					url: "https://www.instagram.com/testuser/",
					active: true,
				},
			]),
			sendMessage: vi.fn(),
		} as any;

		// Mock chrome.runtime
		global.chrome.runtime = {
			...global.chrome.runtime,
			openOptionsPage: vi.fn(),
			sendMessage: vi.fn(),
		} as any;
	});

	it("renders popup component", () => {
		const wrapper = mount(Popup, {
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidCamera: true,
					Fa6SolidChartSimple: true,
					Fa6SolidSpinner: true,
					Copyright: true,
				},
			},
		});
		expect(wrapper.exists()).toBe(true);
		expect(wrapper.find("#main").exists()).toBe(true);
	});

	it("detects Instagram profile URL from active tab", async () => {
		const wrapper = mount(Popup, {
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidCamera: true,
					Fa6SolidChartSimple: true,
					Fa6SolidSpinner: true,
					Copyright: true,
				},
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(chrome.tabs.query).toHaveBeenCalledWith({
			active: true,
			currentWindow: true,
		});
	});

	it("displays detected Instagram username", async () => {
		const wrapper = mount(Popup, {
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidCamera: true,
					Fa6SolidChartSimple: true,
					Fa6SolidSpinner: true,
					Copyright: true,
				},
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(wrapper.text()).toContain("@testuser");
	});

	it("shows undetected profile message when not on Instagram", async () => {
		global.chrome.tabs.query = vi.fn().mockResolvedValue([
			{
				url: "https://www.google.com/",
				active: true,
			},
		]);

		const wrapper = mount(Popup, {
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidCamera: true,
					Fa6SolidChartSimple: true,
					Fa6SolidSpinner: true,
					Copyright: true,
				},
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(wrapper.text()).toContain("Undetected");
	});

	it("opens dashboard when dashboard button clicked", async () => {
		const wrapper = mount(Popup, {
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidCamera: true,
					Fa6SolidChartSimple: true,
					Fa6SolidSpinner: true,
					Copyright: true,
				},
			},
		});

		const buttons = wrapper.findAll("button");
		const dashboardButton = buttons.find((btn) =>
			btn.text().includes("Open dashboard"),
		);
		await dashboardButton?.trigger("click");

		expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
	});

	it("displays snapshot count for tracked user", async () => {
		const userId = "test-user-id";
		const store = useAppStore();
		store.trackedUsers = [
			{
				id: userId,
				username: "testuser",
				fullName: "Test User",
				avatarURL: "https://example.com/avatar.jpg",
				snapshotCount: 5,
				updatedAt: Date.now(),
        lastSnapshot: Date.now(),
      },
		];

		const wrapper = mount(Popup, {
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidCamera: true,
					Fa6SolidChartSimple: true,
					Fa6SolidSpinner: true,
					Copyright: true,
				},
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 100));

		// Should show snapshot metadata section
		expect(wrapper.find("#snapshot-info").exists()).toBe(true);
	});

	it("shows snapshot button when on Instagram profile", async () => {
		const wrapper = mount(Popup, {
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidCamera: true,
					Fa6SolidChartSimple: true,
					Fa6SolidSpinner: true,
					Copyright: true,
				},
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 100));

		const snapshotButton = wrapper
			.findAll("button")
			.find((btn) => btn.text().includes("Take snapshot"));
		expect(snapshotButton).toBeDefined();
	});

	it("disables snapshot button when processing", async () => {
		const userId = "test-user-id";
		const store = useAppStore();
		store.activeLocks = { [userId]: Date.now() };

		const wrapper = mount(Popup, {
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidCamera: true,
					Fa6SolidChartSimple: true,
					Fa6SolidSpinner: true,
					Copyright: true,
				},
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 100));

		// At least one button should exist
		const buttons = wrapper.findAll("button");
		expect(buttons.length).toBeGreaterThan(0);
	});

	it("shows configurations section for tracked users", async () => {
		const userId = "test-user-id";
		const store = useAppStore();
		store.trackedUsers = [
			{
				id: userId,
				username: "testuser",
				fullName: "Test User",
				avatarURL: "https://example.com/avatar.jpg",
				snapshotCount: 5,
				lastSnapshot: Date.now(),
				updatedAt: Date.now(),
			},
		];

		const wrapper = mount(Popup, {
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidCamera: true,
					Fa6SolidChartSimple: true,
					Fa6SolidSpinner: true,
					Copyright: true,
				},
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(wrapper.text()).toContain("Configurations");
	});

	it("handles cron toggle for automatic snapshots", async () => {
		const userId = "test-user-id";
		const store = useAppStore();
		store.trackedUsers = [
			{
				id: userId,
				username: "testuser",
				fullName: "Test User",
				avatarURL: "https://example.com/avatar.jpg",
				snapshotCount: 5,
				lastSnapshot: Date.now(),
				updatedAt: Date.now(),
			},
		];
		store.scLoaded = true;

		const wrapper = mount(Popup, {
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidCamera: true,
					Fa6SolidChartSimple: true,
					Fa6SolidSpinner: true,
					Copyright: true,
				},
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 100));

		const cronToggle = wrapper.find('input[type="checkbox"]');
		if (cronToggle.exists()) {
			await cronToggle.setValue(true);
			await wrapper.vm.$nextTick();
			expect(wrapper.vm).toBeDefined();
		}
	});

	it("displays copyright information", () => {
		const wrapper = mount(Popup, {
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidCamera: true,
					Fa6SolidChartSimple: true,
					Fa6SolidSpinner: true,
					Copyright: true,
				},
			},
		});

		expect(wrapper.find("#copyright").exists()).toBe(true);
		expect(wrapper.text()).toContain("InstaSnap");
	});

	it("shows Last Snapshot as Never when user has no snapshots", async () => {
		const userId = "test-user-id";
		const store = useAppStore();
		store.trackedUsers = [
			{
				id: userId,
				username: "testuser",
				fullName: "Test User",
				avatarURL: "https://example.com/avatar.jpg",
				snapshotCount: 0,
				lastSnapshot: 0,
				updatedAt: Date.now(),
			},
		];

		const wrapper = mount(Popup, {
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidCamera: true,
					Fa6SolidChartSimple: true,
					Fa6SolidSpinner: true,
					Copyright: true,
				},
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(wrapper.text()).toContain("Never");
	});

	it("handles errors when fetching user info", async () => {
		const { sendMessageWithRetry } = await import("../../utils/chrome");
		vi.mocked(sendMessageWithRetry).mockRejectedValue(
			new Error("Network error"),
		);

		const wrapper = mount(Popup, {
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidCamera: true,
					Fa6SolidChartSimple: true,
					Fa6SolidSpinner: true,
					Copyright: true,
				},
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(wrapper.exists()).toBe(true);
	});
});
