import { vi } from "vitest";
import { config } from "@vue/test-utils";
import "fake-indexeddb/auto";

// Mock Chrome API (types from @types/chrome)
(globalThis as any).chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      getKeys: vi.fn().mockResolvedValue([]),
    },
    session: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      getKeys: vi.fn().mockResolvedValue([]),
    },
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(),
    clearAll: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    create: vi.fn(),
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
  },
} as any;

config.global.stubs = {
  teleport: true,
};

// Suppress Vue i18n registration warnings in tests
config.global.config = {
  warnHandler: (msg: string) => {
    // Suppress i18n component registration warnings
    if (msg.includes('has already been registered')) {
      return;
    }
    console.warn(msg);
  },
};

// Don't set global i18n plugin - each test file creates its own instance
