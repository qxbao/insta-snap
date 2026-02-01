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
            value: chrome.runtime.getURL('').slice(0, -1),
          },
          {
            header: "access-control-allow-methods",
            operation: chrome.declarativeNetRequest.HeaderOperation.SET,
            value: "GET, POST, OPTIONS, PUT, DELETE",
          },
          {
            header: "access-control-allow-headers",
            operation: chrome.declarativeNetRequest.HeaderOperation.SET,
            value: chrome.runtime.getURL('').slice(0, -1),
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
  ];

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1, 2],
    addRules: rules,
  });
});
