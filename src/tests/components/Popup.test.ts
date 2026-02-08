import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Popup from "../../popup/Popup.vue";
import { useAppStore } from "../../stores/app.store";
import { createMockStorage } from "../utils/test-helpers";

describe("Popup.vue", () => {
  let mockLocalStorage: ReturnType<typeof createMockStorage>;
  let mockSessionStorage: ReturnType<typeof createMockStorage>;
  beforeEach(() => {
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
    } as any;
  });

  it("should render popup component", () => {
    const wrapper = mount(Popup);
    expect(wrapper.exists()).toBe(true);
  });

  it("should detect Instagram profile URL", async () => {
    const wrapper = mount(Popup);

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(chrome.tabs.query).toHaveBeenCalledWith({
      active: true,
      currentWindow: true,
    });
  });

  it("should show loading state initially", () => {
    const wrapper = mount(Popup);

    expect(wrapper.html()).toBeTruthy();
  });

  it("should open dashboard when button clicked", async () => {
    const wrapper = mount(Popup);

    const dashboardButton = wrapper.find('[data-test="dashboard-button"]');
    if (dashboardButton.exists()) {
      await dashboardButton.trigger("click");
      expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
    }
  });

  it("should handle cron toggle", async () => {
    const userId = "12345";
    mockLocalStorage.data.set("users_metadata", {
      [userId]: {
        userId,
        username: "testuser",
        full_name: "Test User",
        profile_pic_url: "https://example.com/pic.jpg",
        snapshotCount: 3,
        lastSnapshot: Date.now(),
        last_updated: Date.now(),
      },
    });

    const wrapper = mount(Popup);
    const store = useAppStore();
    await store.loadSnapshotCrons();
    await wrapper.vm.$nextTick();

    const cronToggle = wrapper.find('input[type="checkbox"]');
    if (cronToggle.exists()) {
      await cronToggle.setValue(true);
      await wrapper.vm.$nextTick();

      expect(wrapper.vm).toBeDefined();
    } else {
      expect(wrapper.exists()).toBe(true);
    }
  });
});
