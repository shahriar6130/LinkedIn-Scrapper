import { MessageType } from "@/messaging";
import { LoggerService } from "@/services/logger";
import { buildProfileScraper } from "@/scraping/orchestrator";

const logger = new LoggerService();
const TAG = "BG";

// --- Extension icon click: toggle sidebar on LinkedIn profile pages ---
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id && tab.url?.includes("linkedin.com/in/")) {
    chrome.tabs.sendMessage(tab.id, { type: MessageType.TOGGLE_SIDEBAR });
  }
});

// --- Message handler ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MessageType.INJECT_NAV_SCRIPT) {
    const tabId = sender.tab?.id;
    if (tabId) {
      chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN" as const,
        func: injectNavInterceptor,
      }).catch((err) => logger.error(TAG, "Nav script injection failed:", err));
    }
    return false;
  }

  if (message.type === MessageType.GET_STORAGE) {
    chrome.storage.local.get(message.key, (result) => {
      sendResponse(result[message.key] ?? null);
    });
    return true;
  }

  if (message.type === MessageType.SET_STORAGE) {
    chrome.storage.local.set({ [message.key]: message.value }, () => {
      sendResponse(true);
    });
    return true;
  }

  if (message.type === MessageType.SCRAPE_PROFILE) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        sendResponse({ error: "No active tab found" });
        return;
      }
      chrome.scripting
        .executeScript({
          target: { tabId: tab.id },
          world: "MAIN" as const,
          func: buildProfileScraper(),
        })
        .then((results) => {
          const result = results?.[0]?.result;
          if (result?.errors?.length) {
            logger.error(TAG, "Scrape errors:", result.errors);
          }
          if (result?.warnings?.length) {
            logger.info(TAG, "Scrape warnings:", result.warnings);
          }
          if (result?.timing) {
            logger.info(TAG, `Scrape completed in ${result.timing.toFixed(1)}ms`);
          }
          sendResponse(result ?? { error: "No result from scraping" });
        })
        .catch((err) => {
          logger.error(TAG, "Script injection failed:", err);
          sendResponse({ error: `Injection failed: ${err.message || err}` });
        });
    });
    return true;
  }
});

// --- Runs in MAIN world to intercept SPA navigation ---
function injectNavInterceptor() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (function (this: any) {
    var origPush = history.pushState;
    var origReplace = history.replaceState;
    history.pushState = function (this: any, ...args: any[]) {
      origPush.apply(this, args as any);
      window.dispatchEvent(new CustomEvent("alumni-nav-detected"));
    };
    history.replaceState = function (this: any, ...args: any[]) {
      origReplace.apply(this, args as any);
      window.dispatchEvent(new CustomEvent("alumni-nav-detected"));
    };
  })();
}
