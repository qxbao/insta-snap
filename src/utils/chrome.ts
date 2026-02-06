import { ExtensionMessage } from "../constants/actions";
import { ExtensionMessageResponse } from "../constants/status";

const sendMessageToActiveTab = async (
  msg: ExtensionMessage,
  responseCallback?: (response: ExtensionMessageResponse) => void,
) => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (responseCallback) {
    chrome.tabs.sendMessage(
      tabs[0].id!,
      msg,
      responseCallback,
    )
  } else {
    chrome.tabs.sendMessage(tabs[0].id!, msg);
  }
};

export { sendMessageToActiveTab };
