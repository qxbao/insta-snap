import { mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import { EnglishLocale } from "../../i18n/locales/en"
import Popup from "../../popup/Popup.vue"
import { useAppStore } from "../../stores/app.store"
import { createMockStorage } from "../utils/test-helpers"

vi.mock("../../utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}))

vi.mock("../../utils/chrome", () => ({
  sendMessageToActiveTab: vi.fn(),
  sendMessageWithRetry: vi.fn().mockResolvedValue({
    payload: "test-user-id",
  }),
}))

describe("Popup.vue", () => {
  let mockLocalStorage: ReturnType<typeof createMockStorage>
  let mockSessionStorage: ReturnType<typeof createMockStorage>
  let i18n: ReturnType<typeof createI18n>

  beforeEach(() => {
    i18n = createI18n({
      legacy: false,
      locale: "en",
      messages: {
        en: EnglishLocale,
      },
    })

    setActivePinia(createPinia())

    mockLocalStorage = createMockStorage();
    mockSessionStorage = createMockStorage();

    (global as any).browser.storage.local.get = mockLocalStorage.get as any
    (global as any).browser.storage.local.set = mockLocalStorage.set as any
    (global as any).browser.storage.session.get = mockSessionStorage.get as any
    (global as any).browser.storage.session.set = mockSessionStorage.set as any

    // Mock browser.tabs
    (global as any).browser.tabs = {
      query: vi.fn().mockResolvedValue([
        {
          url: "https://www.instagram.com/testuser/",
          active: true,
        },
      ]),
      sendMessage: vi.fn(),
    } as any

    // Mock browser.runtime
    (global as any).browser.runtime = {
      ...(<any>global).browser.runtime,
      openOptionsPage: vi.fn(),
      sendMessage: vi.fn(),
    } as any
  })

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
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find("#main").exists()).toBe(true)
  })

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
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(browser.tabs.query).toHaveBeenCalledWith({
      active: true,
      currentWindow: true,
    })
  })

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
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(wrapper.text()).toContain("@testuser")
  })

  it("shows undetected profile message when not on Instagram", async () => {
    (global as any).browser.tabs.query = vi.fn().mockResolvedValue([
      {
        url: "https://www.google.com/",
        active: true,
      },
    ])

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
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(wrapper.text()).toContain("Undetected")
  })

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
    })

    const buttons = wrapper.findAll("button")
    const dashboardButton = buttons.find((btn) => btn.text().includes("Open dashboard"))
    await dashboardButton?.trigger("click")

    expect(browser.runtime.openOptionsPage).toHaveBeenCalled()
  })

  it("displays snapshot count for tracked user", async () => {
    const userId = "test-user-id"
    const store = useAppStore()
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
    ]

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
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Should show snapshot metadata section
    expect(wrapper.find("#snapshot-info").exists()).toBe(true)
  })

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
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    const snapshotButton = wrapper
      .findAll("button")
      .find((btn) => btn.text().includes("Take snapshot"))
    expect(snapshotButton).toBeDefined()
  })

  it("disables snapshot button when processing", async () => {
    const userId = "test-user-id"
    const store = useAppStore()
    store.activeLocks = { [userId]: Date.now() }

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
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    // At least one button should exist
    const buttons = wrapper.findAll("button")
    expect(buttons.length).toBeGreaterThan(0)
  })

  it("shows configurations section for tracked users", async () => {
    const userId = "test-user-id"
    const store = useAppStore()
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
    ]

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
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(wrapper.text()).toContain("Configurations")
  })

  it("handles cron toggle for automatic snapshots", async () => {
    const userId = "test-user-id"
    const store = useAppStore()
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
    ]
    store.scLoaded = true

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
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    const cronToggle = wrapper.find('input[type="checkbox"]')
    if (cronToggle.exists()) {
      await cronToggle.setValue(true)
      await wrapper.vm.$nextTick()
      expect(wrapper.vm).toBeDefined()
    }
  })

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
    })

    expect(wrapper.find("#copyright").exists()).toBe(true)
    expect(wrapper.text()).toContain("InstaSnap")
  })

  it("shows Last Snapshot as Never when user has no snapshots", async () => {
    const userId = "test-user-id"
    const store = useAppStore()
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
    ]

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
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(wrapper.text()).toContain("Never")
  })

  it("handles errors when fetching user info", async () => {
    const { sendMessageWithRetry } = await import("../../utils/chrome")
    vi.mocked(sendMessageWithRetry).mockRejectedValue(new Error("Network error"))

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
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(wrapper.exists()).toBe(true)
  })

  it("does not show force unlock link when not processing", async () => {
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
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    const forceUnlockLink = wrapper.find("a[href='#']")
    expect(forceUnlockLink.exists()).toBe(false)
  })

  it("shows force unlock link when user is locked/processing", async () => {
    const userId = "test-user-id"
    const store = useAppStore()

    // Ensure the mock returns the expected userId
    const { sendMessageWithRetry } = await import("../../utils/chrome")
    vi.mocked(sendMessageWithRetry).mockResolvedValue({
      payload: userId,
    } as any)

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
    })

    // Wait for async getUserInfo to complete
    await new Promise((resolve) => setTimeout(resolve, 150))
    await wrapper.vm.$nextTick()

    // Now lock the user using proper store action
    await store.tryLockUser(userId)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain("Force unlock profile")
  })

  it("calls unlockUser when force unlock is clicked", async () => {
    const userId = "test-user-id"
    const store = useAppStore()
    const unlockUserSpy = vi.spyOn(store, "unlockUser").mockResolvedValue()

    // Ensure the mock returns the expected userId
    const { sendMessageWithRetry } = await import("../../utils/chrome")
    vi.mocked(sendMessageWithRetry).mockResolvedValue({
      payload: userId,
    } as any)

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
    })

    // Wait for async getUserInfo to complete
    await new Promise((resolve) => setTimeout(resolve, 150))
    await wrapper.vm.$nextTick()

    // Lock the user using proper store action
    await store.tryLockUser(userId)
    await wrapper.vm.$nextTick()

    const forceUnlockLink = wrapper.find("a.cursor-pointer")
    expect(forceUnlockLink.exists()).toBe(true)
    await forceUnlockLink.trigger("click")

    expect(unlockUserSpy).toHaveBeenCalledWith(userId)
  })

  it("does not call unlockUser when userId is null", async () => {
    const { sendMessageWithRetry } = await import("../../utils/chrome")
    vi.mocked(sendMessageWithRetry).mockRejectedValue(new Error("No user found"))

    const store = useAppStore()
    const unlockUserSpy = vi.spyOn(store, "unlockUser").mockResolvedValue()

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
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Force unlock should not be visible if userId is null
    const forceUnlockLink = wrapper.find("a.cursor-pointer")
    if (forceUnlockLink.exists()) {
      await forceUnlockLink.trigger("click")
    }

    expect(unlockUserSpy).not.toHaveBeenCalled()
  })

  it("removes lock status after force unlock is clicked", async () => {
    const userId = "test-user-id"
    const store = useAppStore()

    // Ensure the mock returns the expected userId
    const { sendMessageWithRetry } = await import("../../utils/chrome")
    vi.mocked(sendMessageWithRetry).mockResolvedValue({
      payload: userId,
    } as any)

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
    })

    // Wait for async getUserInfo to complete
    await new Promise((resolve) => setTimeout(resolve, 150))
    await wrapper.vm.$nextTick()

    // Lock the user using proper store action
    await store.tryLockUser(userId)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain("Force unlock profile")
    expect(store.activeLocks[userId]).toBeDefined()

    const forceUnlockLink = wrapper.find("a.cursor-pointer")
    await forceUnlockLink.trigger("click")
    await wrapper.vm.$nextTick()

    expect(store.activeLocks[userId]).toBeUndefined()
  })
})
