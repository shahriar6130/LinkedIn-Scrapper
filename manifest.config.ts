import { defineManifest } from "@crxjs/vite-plugin";
import { version } from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: "LinkedIn Alumni Scraper",
  version,
  description:
    "Collect Dhaka University alumni from LinkedIn profiles with a premium sidebar experience.",
  permissions: ["activeTab", "storage", "scripting"],
  host_permissions: ["*://www.linkedin.com/in/*"],
  action: {
    default_icon: {
      "16": "public/icons/icon16.png",
      "48": "public/icons/icon48.png",
      "128": "public/icons/icon128.png",
    },
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["*://www.linkedin.com/in/*"],
      js: ["src/content/index.tsx"],
      run_at: "document_idle",
    },
  ],
  icons: {
    "16": "public/icons/icon16.png",
    "48": "public/icons/icon48.png",
    "128": "public/icons/icon128.png",
  },
  web_accessible_resources: [
    {
      resources: ["assets/*", "public/icons/*"],
      matches: ["*://www.linkedin.com/*"],
    },
  ],
});
