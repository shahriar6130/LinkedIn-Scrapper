import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync, readdirSync, statSync } from "fs";

// Plugin to copy public assets (manifest, icons) to dist
function copyPublicAssets() {
  return {
    name: "copy-public-assets",
    closeBundle() {
      const src = resolve(__dirname, "public");
      const dest = resolve(__dirname, "dist");

      function copyDir(srcDir: string, destDir: string) {
        mkdirSync(destDir, { recursive: true });
        const entries = readdirSync(srcDir);
        for (const entry of entries) {
          const srcPath = resolve(srcDir, entry);
          const destPath = resolve(destDir, entry);
          if (statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
          } else {
            copyFileSync(srcPath, destPath);
          }
        }
      }

      copyDir(src, dest);
    },
  };
}

export default defineConfig({
  plugins: [react(), copyPublicAssets()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, "src/content/index.tsx"),
        background: resolve(__dirname, "src/background/index.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name].[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) return "assets/[name].[ext]";
          return "assets/[name].[hash].[ext]";
        },
      },
    },
  },
});
