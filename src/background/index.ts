// Background service worker - handles message passing and extension icon click

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id && tab.url?.includes("linkedin.com/in/")) {
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDEBAR" });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "INJECT_NAV_SCRIPT") {
    const tabId = sender.tab?.id;
    if (tabId) {
      chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN" as const,
        func: injectNavInterceptor,
      }).catch((err) => console.error("[BG] Nav script injection failed:", err));
    }
    return false;
  }

  if (message.type === "GET_STORAGE") {
    chrome.storage.local.get(message.key, (result) => {
      sendResponse(result[message.key] ?? null);
    });
    return true;
  }

  if (message.type === "SET_STORAGE") {
    chrome.storage.local.set({ [message.key]: message.value }, () => {
      sendResponse(true);
    });
    return true;
  }

  if (message.type === "SCRAPE_PROFILE") {
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
            console.error("[BG] Scrape error:", result.error);
          }
          sendResponse(result ?? { error: "No result from scraping" });
        })
        .catch((err) => {
          console.error("[BG] Script injection failed:", err);
          sendResponse({ error: `Injection failed: ${err.message || err}` });
        });
    });
    return true;
  }
});

// Runs in MAIN world to intercept SPA navigation
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

// This function runs in MAIN world on the LinkedIn page
function scrapeProfileFromDOM() {
  try {
    // --- NAME ---
    // LinkedIn logged-in: h2 with hashed classes (no h1 on page)
    // LinkedIn public: h1.top-card-layout__title
    // Classic: h1
    let name = "";

    // Try h1 first (public profile, classic)
    const h1 = document.querySelector("h1");
    if (h1) {
      const h1Text = h1.textContent?.trim().replace(/\s+/g, " ") || "";
      // Skip nav h1s like "0 notifications"
      if (h1Text && h1Text.length > 2 && h1Text.length < 60 && !h1Text.includes("notification")) {
        name = h1Text;
      }
    }

    // Try h2 (new redesign - logged-in view)
    if (!name) {
      const h2s = document.querySelectorAll("h2");
      for (const h2 of h2s) {
        const text = h2.textContent?.trim().replace(/\s+/g, " ") || "";
        // Person name: 2+ words, letters/spaces/hyphens/apostrophes/dots only
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
    // Extract location from profile header area
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
          // Location pattern: "City, Country" or contains common location keywords
          if (
            t &&
            t.length > 3 &&
            t.length < 60 &&
            (t.includes(", ") || /city|country|region|division/i.test(t)) &&
            !t.includes("followers") &&
            !t.includes("connections") &&
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

    // Fallback location from classic selectors
    if (!location) {
      const classicLoc = document.querySelector(
        ".text-body-small.inline, [itemprop='address'], .profile-info-subheader > span"
      );
      if (classicLoc) {
        location = classicLoc.textContent?.trim().replace(/\s+/g, " ") || "";
      }
    }

    // --- EXPERIENCE (Designation + Company) ---
    // Find "Experience" h2, then extract from first experience item's <p> tags
    // Structure: P1=Designation, P2=Company · Type, P3=Timeline
    let designation = "";
    let companyName = "";

    const allH2s = document.querySelectorAll("h2");
    for (const h2 of allH2s) {
      if (h2.textContent?.trim() === "Experience") {
        // Get the section container (parent of h2's parent)
        let section: Element | null = h2.parentElement?.parentElement || null;
        // Find experience item containers
        if (section) {
          // Look for divs that contain P tags (experience items)
          const allDivs = section.querySelectorAll("div");
          for (const item of allDivs) {
            const ps = item.querySelectorAll("p");
            if (ps.length >= 2) {
              const p1 = ps[0].textContent?.trim().replace(/\s+/g, " ") || "";
              const p2 = ps.length > 1 ? ps[1].textContent?.trim().replace(/\s+/g, " ") || "" : "";
              // First P is designation (role title) - should not contain "·"
              if (p1 && p1.length > 1 && p1.length < 100 && !p1.includes("·")) {
                designation = p1;
              }
              // Second P is "Company · Type" - extract company name before the dot
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

    // Fallback: try headline area for designation/company
    if (!designation && nameEl) {
      let container = nameEl.parentElement;
      for (let depth = 0; depth < 5 && container; depth++) {
        const ps = container.querySelectorAll(":scope > p");
        for (const p of ps) {
          const t = p.textContent?.trim().replace(/\s+/g, " ") || "";
          if (
            t &&
            t.length > 5 &&
            t.length < 150 &&
            !t.includes("followers") &&
            !t.includes("connections") &&
            !/^·?\s*(1st|2nd|3rd|[4-9]th)\s*$/i.test(t) &&
            !t.includes(", ") // Skip location-like text
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
    // The profile photo is in the same profile card container as the name h2,
    // but in a sibling branch (not ancestor). Find the profile card container first.
    let profilePicture = "";

    if (nameEl) {
      // Walk up to find the profile card container (the one that has both name and photo)
      // Based on DOM inspection: name h2 is at D0, profile card is at ~D4-D5
      let cardContainer: Element | null = nameEl;
      for (let d = 0; d < 6 && cardContainer; d++) {
        // Check if this container has a large profile-displayphoto image
        const imgs = cardContainer.querySelectorAll("img[src*='profile-displayphoto']");
        for (const img of imgs) {
          const el = img as HTMLImageElement;
          if (
            el.src &&
            !el.src.includes("emoji") &&
            (el.naturalWidth || 0) >= 150 &&
            (el.naturalHeight || 0) >= 150
          ) {
            profilePicture = el.src;
            break;
          }
        }
        if (profilePicture) break;
        cardContainer = cardContainer.parentElement;
      }
    }

    // Fallback: find the largest profile-displayphoto image on the entire page
    if (!profilePicture) {
      const allImgs = document.querySelectorAll("img[src*='profile-displayphoto']");
      let bestSrc = "";
      let bestArea = 0;
      for (const img of allImgs) {
        const el = img as HTMLImageElement;
        if (el.src && !el.src.includes("emoji")) {
          const area = (el.naturalWidth || 0) * (el.naturalHeight || 0);
          if (area > bestArea && area > 10000) {
            // Only consider images larger than 100x100
            bestArea = area;
            bestSrc = el.src;
          }
        }
      }
      if (bestSrc) profilePicture = bestSrc;
    }

    // Upgrade image resolution to highest quality
    if (profilePicture) {
      profilePicture = profilePicture
        .replace(/shrink_\d+_\d+/, "scale_400_400")
        .replace(/scale_\d+_\d+/, "scale_400_400");
    }

    // --- EDUCATION ---
    // Find "Education" h2, then extract school + degree + timeline from first education item's <p> tags
    // Structure: P1=Institute, P2=Degree, P3=Timeline
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
              // First P is institute name
              if (p1 && p1.length > 3 && p1.length < 120) {
                educationInstitute = p1;
              }
              // Second P is degree
              if (p2 && p2.length > 1 && p2.length < 100 && !p2.match(/^\d{4}/)) {
                degree = p2;
              }
              // Third P is timeline (contains year)
              if (p3 && /\d{4}/.test(p3)) {
                educationTimeline = p3;
              }
              if (educationInstitute || degree) break;
            }
          }
        }
        break;
      }
    }

    // --- CONNECTION DEGREE ---
    let connectionDegree = "";
    // Try classic selector first
    const badgeEl = document.querySelector(
      ".pv-top-card--list .distance-badge .visually-hidden"
    );
    if (badgeEl) {
      connectionDegree = badgeEl.textContent?.trim() || "";
    }
    // Fallback: look for connection degree span/button near the name element
    if (!connectionDegree && nameEl) {
      let container: Element | null = nameEl;
      for (let d = 0; d < 6 && container; d++) {
        // Look for spans/buttons with "1st", "2nd", "3rd" text
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
