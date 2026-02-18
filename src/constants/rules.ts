import Browser from "webextension-polyfill"

const EXTENSION_ORIGIN = Browser.runtime.getURL("").slice(0, -1)

export const ExtensionRules: Browser.DeclarativeNetRequest.Rule[] = [
  {
    id: 1,
    priority: 1,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        {
          header: "access-control-allow-origin",
          operation: "set",
          value: EXTENSION_ORIGIN,
        },
        {
          header: "cross-origin-resource-policy",
          operation: "set",
          value: "cross-origin",
        },
        {
          header: "access-control-allow-methods",
          operation: "set",
          value: "GET, POST, OPTIONS",
        },
        {
          header: "access-control-allow-headers",
          operation: "set",
          value: "Content-Type, Authorization",
        },
      ],
    },
    condition: {
      initiatorDomains: [Browser.runtime.id],
      urlFilter: "||instagram.com",
      resourceTypes: [
        "image",
        "xmlhttprequest",
      ],
    },
  },
  {
    id: 2,
    priority: 2,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        {
          header: "cross-origin-resource-policy",
          operation: "set",
          value: "cross-origin",
        },
        {
          header: "access-control-allow-origin",
          operation: "set",
          value: "*",
        },
      ],
    },
    condition: {
      initiatorDomains: [Browser.runtime.id],
      urlFilter: "||cdninstagram.com",
      resourceTypes: ["image"],
    },
  },
  {
    id: 3,
    priority: 2,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        {
          header: "cross-origin-resource-policy",
          operation: "set",
          value: "cross-origin",
        },
        {
          header: "access-control-allow-origin",
          operation: "set",
          value: "*",
        },
      ],
    },
    condition: {
      initiatorDomains: [Browser.runtime.id],
      urlFilter: "||fbcdn.net",
      resourceTypes: ["image"],
    },
  },
]
