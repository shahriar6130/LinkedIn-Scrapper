import React from "react";
import { createRoot } from "react-dom/client";
import App from "@/sidebar/App";
import "@/sidebar/styles/globals.css";
import { MessageType } from "@/messaging";

async function injectSidebar() {
  // Avoid double injection
  if (document.getElementById("alumni-sidebar-root")) return;

  // Mount sidebar directly to page (no shadow DOM)
  // CSS is injected at page level via import, scoped by #alumni-sidebar-root prefix
  const host = document.createElement("div");
  host.id = "alumni-sidebar-root";
  host.style.cssText =
    "position:fixed;top:0;right:0;z-index:99999999;height:100vh;";
  document.body.appendChild(host);

  const root = createRoot(host);
  root.render(<App />);
}

// Listen for toggle messages from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MessageType.TOGGLE_SIDEBAR) {
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
chrome.runtime.sendMessage({ type: MessageType.INJECT_NAV_SCRIPT });

injectSidebar();
