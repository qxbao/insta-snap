const EXTENSION_ORIGIN = chrome.runtime.getURL("").slice(0, -1);

export const ExtensionRules: chrome.declarativeNetRequest.Rule[] = [
  {
    id: 1,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      responseHeaders: [
        {
          header: "access-control-allow-origin",
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          value: EXTENSION_ORIGIN,
        },
        {
          header: "cross-origin-resource-policy",
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          value: "cross-origin",
        },
        {
          header: "access-control-allow-methods",
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          value: "GET, POST, OPTIONS",
        },
        {
          header: "access-control-allow-headers",
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          value: "Content-Type, Authorization",
        },
      ],
    },
    condition: {
      initiatorDomains: [chrome.runtime.id],
      urlFilter: "||instagram.com",
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.IMAGE,
        chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
      ],
    },
  },
  {
    id: 2,
    priority: 2,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      responseHeaders: [
        {
          header: "cross-origin-resource-policy",
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          value: "cross-origin",
        },
        {
          header: "access-control-allow-origin",
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          value: "*",
        },
      ],
    },
    condition: {
      urlFilter: "*",
      domains: ["cdninstagram.com", "fbcdn.net"],
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.IMAGE],
    },
  },
];
