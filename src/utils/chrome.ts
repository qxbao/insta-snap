import { ExtensionMessage } from "../constants/actions";

const sendMessageToActiveTab = async (
  msg: ExtensionMessage,
  responseCallback?: (response: any) => void,
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
