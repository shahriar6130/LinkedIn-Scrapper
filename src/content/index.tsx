import React from "react";
import { createRoot } from "react-dom/client";
import App from "@/sidebar/App";
import "@/sidebar/styles/globals.css";

async function injectSidebar() {
  // Avoid double injection
  if (document.getElementById("alumni-sidebar-root")) return;

  const host = document.createElement("div");
  host.id = "alumni-sidebar-root";
  host.style.cssText =
    "position:fixed;top:0;right:0;z-index:99999999;height:100vh;pointer-events:none;";
  document.body.appendChild(host);

  // Create shadow DOM for style isolation
  const shadow = host.attachShadow({ mode: "open" });

  // Inject a style reset inside shadow
  const resetStyle = document.createElement("style");
  resetStyle.textContent = `
    :host {
      all: initial;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      line-height: 20px;
      color: #0f172a;
    }
    * { box-sizing: border-box; }
  `;
  shadow.appendChild(resetStyle);

  // Fetch and inject the built CSS (Tailwind + globals) into shadow DOM
  try {
    const cssUrl = chrome.runtime.getURL("assets/content.css");
    const cssText = await fetch(cssUrl).then((r) => r.text());
    const styleEl = document.createElement("style");
    styleEl.textContent = cssText;
    shadow.appendChild(styleEl);
  } catch (e) {
    console.error("[Alumni Sidebar] Failed to load CSS:", e);
  }

  // Mount point
  const mount = document.createElement("div");
  mount.id = "sidebar-mount";
  mount.style.cssText = "height:100%;pointer-events:auto;";
  shadow.appendChild(mount);

  const root = createRoot(mount);
  root.render(<App />);
}

// Listen for toggle messages from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TOGGLE_SIDEBAR") {
    window.dispatchEvent(new CustomEvent("alumni-sidebar-toggle"));
  }
});

// Detect SPA navigation (LinkedIn uses pushState/replaceState)
// Must inject into MAIN world to intercept the page's own history calls
let lastUrl = window.location.href;

function onUrlChanged() {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    if (currentUrl.includes("/in/")) {
      window.dispatchEvent(
        new CustomEvent("alumni-sidebar-url-change", { detail: currentUrl })
      );
    }
  }
}

// Listen for URL change notifications from MAIN world script
window.addEventListener("alumni-nav-detected", onUrlChanged);

// Also listen for popstate (back/forward) — works in isolated world
window.addEventListener("popstate", () => {
  setTimeout(onUrlChanged, 100);
});

// Request MAIN world nav interception from background (avoids inline script CSP violation)
chrome.runtime.sendMessage({ type: "INJECT_NAV_SCRIPT" });

injectSidebar();
