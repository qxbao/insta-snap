import { ActionType } from "./constants/actions";
import { ExtensionMessageResponse, Status } from "./constants/status";

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("dashboard.html"),
  });
});

chrome.runtime.onInstalled.addListener(() => {
  const rules = [
    {
      id: 1,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
        responseHeaders: [
          {
            header: "cross-origin-resource-policy",
            operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
          },
          {
            header: "access-control-allow-origin",
            operation: chrome.declarativeNetRequest.HeaderOperation.SET,
            value: "*",
          },
        ],
      },
      condition: {
        urlFilter: "||cdninstagram.com",
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.IMAGE],
      },
    },
    {
      id: 2,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
        responseHeaders: [
          {
            header: "access-control-allow-origin",
            operation: chrome.declarativeNetRequest.HeaderOperation.SET,
            value: chrome.runtime.getURL("").slice(0, -1),
          },
          {
            header: "access-control-allow-methods",
            operation: chrome.declarativeNetRequest.HeaderOperation.SET,
            value: "GET, POST, OPTIONS, PUT, DELETE",
          },
          {
            header: "access-control-allow-headers",
            operation: chrome.declarativeNetRequest.HeaderOperation.SET,
            value: chrome.runtime.getURL("").slice(0, -1),
          },
          {
            header: "cross-origin-resource-policy",
            operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
          },
        ],
      },
      condition: {
        urlFilter: "||instagram.com",
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
          chrome.declarativeNetRequest.ResourceType.IMAGE,
        ],
      },
    },
    {
      id: 3,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
        responseHeaders: [
          {
            header: "cross-origin-resource-policy",
            operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
          },
          {
            header: "access-control-allow-origin",
            operation: chrome.declarativeNetRequest.HeaderOperation.SET,
            value: "*",
          },
        ],
      },
      condition: {
        urlFilter: "||fbcdn.net",
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.IMAGE],
      },
    },
  ];

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1, 2, 3],
    addRules: rules,
  });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "session" && changes["locks"]) {
    const newLocks = changes["locks"].newValue;
    if (newLocks === undefined) {
      chrome.runtime.sendMessage({
        type: ActionType.SYNC_LOCKS,
        payload: {
          
        },
      }).catch(() => {
        // Ignore if no listener in background
      });
    } else {
      chrome.runtime.sendMessage({
        type: ActionType.SYNC_LOCKS,
        payload: newLocks,
      }).catch(() => {
        // Ignore if no listener in background
      });
    }

    chrome.tabs.query({}).then((tabs) => {
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: ActionType.SYNC_LOCKS,
            payload: newLocks,
          }).catch(() => {
            // Ignore if content script not loaded
          });
        }
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === Status.SnapshotComplete) {
    const userId = message.payload;
    chrome.storage.session.get("locks").then((res) => {
      const locks = { ...(res.locks || {}) } as Record<string, number>;
      if (userId in locks) {
        delete locks[userId];
        chrome.storage.session.set({ locks });
      }
    }).catch((error) => {
      console.error("Failed to update locks:", error);
    });
  }
});
