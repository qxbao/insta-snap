import { ExtensionMessage } from "../constants/actions";
import { ExtensionMessageResponse } from "../constants/status";
import { createLogger } from "./logger";

const logger = createLogger("ChromeUtils");

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

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

/**
 * Send message to active tab with retry mechanism
 * @param msg Extension message to send
 * @param options Retry configuration
 * @returns Promise with response or throws error after max retries
 */
const sendMessageWithRetry = async <T = unknown>(
  msg: ExtensionMessage,
  options: RetryOptions = {},
): Promise<ExtensionMessageResponse<T>> => {
  const { maxRetries = 3, retryDelay = 1000, timeout = 5000 } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tabs[0]?.id) {
        throw new Error("No active tab found");
      }

      const response = await Promise.race([
        new Promise<ExtensionMessageResponse<T>>((resolve, reject) => {
          chrome.tabs.sendMessage(
            tabs[0].id!,
            msg,
            (response: ExtensionMessageResponse<T>) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else if (!response) {
                reject(new Error("No response received"));
              } else {
                resolve(response);
              }
            },
          );
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), timeout),
        ),
      ]);

      logger.info(`Message sent successfully on attempt ${attempt + 1}`);
      return response;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      
      if (isLastAttempt) {
        logger.error(`Failed after ${maxRetries} attempts:`, error);
        throw error;
      }

      const delay = retryDelay * Math.pow(2, attempt);
      logger.debug(
        `Attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
        error,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Max retries exceeded");
};

export { sendMessageToActiveTab, sendMessageWithRetry };
