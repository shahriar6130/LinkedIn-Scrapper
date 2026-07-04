import type { IMessageBus } from "@/services/interfaces";

/**
 * Typed wrapper around chrome.runtime messaging.
 * Used by sidebar/content scripts to communicate with the background service worker.
 */
export class ChromeMessageBus implements IMessageBus {
  sendMessage<T>(type: string, payload?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type, ...((payload as object) ?? {}) }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response as T);
      });
    });
  }
}
