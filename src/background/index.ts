import { MessageType } from "@/messaging";
import { LoggerService } from "@/services/logger";

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
          func: scrapeProfileFromDOM,
        })
        .then((results) => {
          const result = results?.[0]?.result;
          if (result?.error) {
            logger.error(TAG, "Scrape error:", result.error);
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

// --- Runs in MAIN world on the LinkedIn page to extract profile data ---
function scrapeProfileFromDOM() {
  try {
    // --- NAME ---
    let name = "";

    const h1 = document.querySelector("h1");
    if (h1) {
      const h1Text = h1.textContent?.trim().replace(/\s+/g, " ") || "";
      if (h1Text && h1Text.length > 2 && h1Text.length < 60 && !h1Text.includes("notification")) {
        name = h1Text;
      }
    }

    if (!name) {
      const h2s = document.querySelectorAll("h2");
      for (const h2 of h2s) {
        const text = h2.textContent?.trim().replace(/\s+/g, " ") || "";
        if (
          text.length > 2 &&
          text.length < 60 &&
          /^[A-Za-z\s'\-\.]+$/.test(text) &&
          text.split(/\s+/).length >= 2 &&
          !text.includes("notification") &&
          !text.includes("About") &&
          !text.includes("Activity") &&
          !text.includes("Experience") &&
          !text.includes("Education")
        ) {
          name = text;
          break;
        }
      }
    }

    if (!name) {
      return { error: "No name found. URL: " + window.location.href };
    }

    const profileLink = window.location.href.split("?")[0];

    // --- LOCATION ---
    let location = "";
    const nameEl = Array.from(document.querySelectorAll("h1, h2")).find(
      (el) => el.textContent?.trim().replace(/\s+/g, " ") === name
    );

    if (nameEl) {
      let container = nameEl.parentElement;
      for (let depth = 0; depth < 5 && container; depth++) {
        const ps = container.querySelectorAll(":scope > p");
        for (const p of ps) {
          const t = p.textContent?.trim().replace(/\s+/g, " ") || "";
          if (
            t && t.length > 3 && t.length < 60 &&
            (t.includes(", ") || /city|country|region|division/i.test(t)) &&
            !t.includes("followers") && !t.includes("connections") &&
            !/^·?\s*(1st|2nd|3rd|[4-9]th)\s*$/i.test(t)
          ) {
            location = t;
            break;
          }
        }
        if (location) break;
        container = container.parentElement;
      }
    }

    if (!location) {
      const classicLoc = document.querySelector(
        ".text-body-small.inline, [itemprop='address'], .profile-info-subheader > span"
      );
      if (classicLoc) {
        location = classicLoc.textContent?.trim().replace(/\s+/g, " ") || "";
      }
    }

    // --- EXPERIENCE (Designation + Company) ---
    let designation = "";
    let companyName = "";

    const allH2s = document.querySelectorAll("h2");
    for (const h2 of allH2s) {
      if (h2.textContent?.trim() === "Experience") {
        let section: Element | null = h2.parentElement?.parentElement || null;
        if (section) {
          const allDivs = section.querySelectorAll("div");
          for (const item of allDivs) {
            const ps = item.querySelectorAll("p");
            if (ps.length >= 2) {
              const p1 = ps[0].textContent?.trim().replace(/\s+/g, " ") || "";
              const p2 = ps.length > 1 ? ps[1].textContent?.trim().replace(/\s+/g, " ") || "" : "";
              if (p1 && p1.length > 1 && p1.length < 100 && !p1.includes("·")) {
                designation = p1;
              }
              if (p2 && p2.length > 1 && p2.length < 100) {
                const dotMatch = p2.match(/^(.+?)\s*[\u00B7\u2022]\s*(.+)$/);
                companyName = dotMatch ? dotMatch[1].trim() : p2;
              }
              if (designation || companyName) break;
            }
          }
        }
        break;
      }
    }

    if (!designation && nameEl) {
      let container = nameEl.parentElement;
      for (let depth = 0; depth < 5 && container; depth++) {
        const ps = container.querySelectorAll(":scope > p");
        for (const p of ps) {
          const t = p.textContent?.trim().replace(/\s+/g, " ") || "";
          if (
            t && t.length > 5 && t.length < 150 &&
            !t.includes("followers") && !t.includes("connections") &&
            !/^·?\s*(1st|2nd|3rd|[4-9]th)\s*$/i.test(t) &&
            !t.includes(", ")
          ) {
            designation = t;
            break;
          }
        }
        if (designation) break;
        container = container.parentElement;
      }
    }

    // --- PROFILE PICTURE ---
    let profilePicture = "";

    if (nameEl) {
      let cardContainer: Element | null = nameEl;
      for (let d = 0; d < 6 && cardContainer; d++) {
        const imgs = cardContainer.querySelectorAll("img[src*='profile-displayphoto']");
        for (const img of imgs) {
          const el = img as HTMLImageElement;
          if (
            el.src && !el.src.includes("emoji") &&
            (el.naturalWidth || 0) >= 150 && (el.naturalHeight || 0) >= 150
          ) {
            profilePicture = el.src;
            break;
          }
        }
        if (profilePicture) break;
        cardContainer = cardContainer.parentElement;
      }
    }

    if (!profilePicture) {
      const allImgs = document.querySelectorAll("img[src*='profile-displayphoto']");
      let bestSrc = "";
      let bestArea = 0;
      for (const img of allImgs) {
        const el = img as HTMLImageElement;
        if (el.src && !el.src.includes("emoji")) {
          const area = (el.naturalWidth || 0) * (el.naturalHeight || 0);
          if (area > bestArea && area > 10000) {
            bestArea = area;
            bestSrc = el.src;
          }
        }
      }
      if (bestSrc) profilePicture = bestSrc;
    }

    if (profilePicture) {
      profilePicture = profilePicture
        .replace(/shrink_\d+_\d+/, "scale_400_400")
        .replace(/scale_\d+_\d+/, "scale_400_400");
    }

    // --- EDUCATION ---
    let educationInstitute = "";
    let degree = "";
    let educationTimeline = "";

    for (const h2 of allH2s) {
      if (h2.textContent?.trim() === "Education") {
        let section: Element | null = h2.parentElement?.parentElement || null;
        if (section) {
          const allDivs = section.querySelectorAll("div");
          for (const item of allDivs) {
            const ps = item.querySelectorAll("p");
            if (ps.length >= 2) {
              const p1 = ps[0].textContent?.trim().replace(/\s+/g, " ") || "";
              const p2 = ps.length > 1 ? ps[1].textContent?.trim().replace(/\s+/g, " ") || "" : "";
              const p3 = ps.length >= 3 ? ps[2].textContent?.trim().replace(/\s+/g, " ") || "" : "";
              if (p1 && p1.length > 3 && p1.length < 120) educationInstitute = p1;
              if (p2 && p2.length > 1 && p2.length < 100 && !p2.match(/^\d{4}/)) degree = p2;
              if (p3 && /\d{4}/.test(p3)) educationTimeline = p3;
              if (educationInstitute || degree) break;
            }
          }
        }
        break;
      }
    }

    // --- CONNECTION DEGREE ---
    let connectionDegree = "";
    const badgeEl = document.querySelector(
      ".pv-top-card--list .distance-badge .visually-hidden"
    );
    if (badgeEl) {
      connectionDegree = badgeEl.textContent?.trim() || "";
    }
    if (!connectionDegree && nameEl) {
      let container: Element | null = nameEl;
      for (let d = 0; d < 6 && container; d++) {
        const candidates = container.querySelectorAll("span, button");
        for (const cand of candidates) {
          const t = cand.textContent?.trim() || "";
          const match = t.match(/^(?:·\s*)?(1st|2nd|3rd|[4-9]th)$/i);
          if (match) {
            connectionDegree = match[1];
            break;
          }
        }
        if (connectionDegree) break;
        container = container.parentElement;
      }
    }

    return {
      name,
      designation,
      companyName,
      profileLink,
      location,
      educationInstitute,
      degree,
      educationTimeline,
      profilePicture,
      connectionDegree,
    };
  } catch (err) {
    return { error: "Scrape error: " + (err instanceof Error ? err.message : String(err)) };
  }
}
