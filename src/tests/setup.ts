import { vi } from "vitest"
import { config } from "@vue/test-utils"
import "fake-indexeddb/auto"

const mockBrowser = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      getKeys: vi.fn(),
      onChanged: { addListener: vi.fn() },
    },
    session: {
      get: vi.fn(),
      set: vi.fn(),
      onChanged: { addListener: vi.fn() },
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
    getURL: vi.fn((path) => `chrome-extension://mock-id/${path}`),
    id: "mock-extension-id",
    openOptionsPage: vi.fn(),
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
  alarms: {
    create: vi.fn(),
    onAlarm: { addListener: vi.fn() },
  },
  i18n: {
    getMessage: vi.fn((key) => key),
    getUILanguage: vi.fn(() => "en-US"),
  },
  declarativeNetRequest: {
    updateDynamicRules: vi.fn(),
  },
}

vi.mock("webextension-polyfill", () => {
  return {
    __esModule: true,
    default: mockBrowser,
  }
})
;(globalThis as any).browser = mockBrowser
;(globalThis as any).chrome = mockBrowser

config.global.stubs = {
  teleport: true,
}

config.global.config = {
  warnHandler: (msg: string) => {
    if (msg.includes("has already been registered")) {
      return
    }
    console.warn(msg)
  },
}

export { mockBrowser }
