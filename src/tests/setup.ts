import { vi } from "vitest";
import { config } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import { EnglishLocale } from "../i18n/locales/en";
import { VietnameseLocale } from "../i18n/locales/vi";

const i18n = createI18n({
  legacy: false,
  locale: "en",
  messages: {
    en: EnglishLocale,
    vi: VietnameseLocale
  },
});

// Mock Chrome API (types from @types/chrome)
(globalThis as any).chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
    session: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
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

config.global.plugins = [i18n];
