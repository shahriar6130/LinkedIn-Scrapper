import type { IImageUploadProvider } from "./types";
import { CloudflareR2Provider } from "./cloudflare-r2";
import { SupabaseProvider } from "./supabase";
import { CloudinaryProvider } from "./cloudinary";

export type { IImageUploadProvider, ImagePipelineResult } from "./types";
export { CloudflareR2Provider } from "./cloudflare-r2";
export { SupabaseProvider } from "./supabase";
export { CloudinaryProvider } from "./cloudinary";

/**
 * Create the configured image upload provider(s) based on
 * the VITE_IMAGE_PROVIDER environment variable.
 *
 * Supports comma-separated values for fallback chaining,
 * e.g. "supabase,cloudinary" tries Supabase first, then Cloudinary.
 *
 * Returns an empty array if no provider is configured (pipeline disabled).
 */
export function createImageProviders(): IImageUploadProvider[] {
  const raw = import.meta.env.VITE_IMAGE_PROVIDER as string | undefined;
  if (!raw) return [];

  const providers: IImageUploadProvider[] = [];
  const names = raw.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);

  for (const name of names) {
    switch (name) {
      case "cloudflare": providers.push(new CloudflareR2Provider()); break;
      case "supabase":   providers.push(new SupabaseProvider()); break;
      case "cloudinary": providers.push(new CloudinaryProvider()); break;
    }
  }

  return providers;
}

/**
 * Backwards-compatible single-provider accessor.
 * Returns the first configured provider, or null.
 */
export function createImageProvider(): IImageUploadProvider | null {
  return createImageProviders()[0] ?? null;
}
