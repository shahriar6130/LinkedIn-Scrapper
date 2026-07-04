import type { IImageUploadProvider, ImagePipelineResult } from "@/services/image-providers/types";
import type { IImagePipelineService } from "../interfaces";

const MAX_RETRIES = 3;
const MIN_IMAGE_SIZE = 1024;        // 1 KB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Image pipeline: fetch -> validate -> upload (with retry).
 *
 * Runs in the background service worker context.
 * Falls back to MAIN world fetch if CORS blocks direct access.
 */
export class ImagePipelineService implements IImagePipelineService {
  private providers: IImageUploadProvider[];

  constructor(providers: IImageUploadProvider[]) {
    this.providers = providers;
  }

  async processImage(linkedinUrl: string): Promise<ImagePipelineResult> {
    const warnings: string[] = [];

    if (!linkedinUrl) {
      return {
        hostedUrl: "",
        originalUrl: "",
        provider: this.providers.map((p) => p.name).join(",") || "none",
        warnings: ["No image URL provided"],
      };
    }

    // Step 1: Fetch the image
    let blob: Blob;
    try {
      blob = await this.fetchImage(linkedinUrl);
    } catch (err) {
      warnings.push(
        "Image fetch failed: " + (err instanceof Error ? err.message : String(err))
      );
      return {
        hostedUrl: "",
        originalUrl: linkedinUrl,
        provider: this.providers.map((p) => p.name).join(",") || "none",
        warnings,
      };
    }

    // Step 2: Validate
    const validationWarning = this.validateImage(blob);
    if (validationWarning) {
      warnings.push(validationWarning);
      return {
        hostedUrl: "",
        originalUrl: linkedinUrl,
        provider: this.providers.map((p) => p.name).join(",") || "none",
        warnings,
      };
    }

    // Step 3: Upload with retry across provider chain
    const filename = this.generateFilename(linkedinUrl);
    try {
      const { hostedUrl, providerName } = await this.uploadWithFallback(blob, filename, warnings);
      return {
        hostedUrl,
        originalUrl: linkedinUrl,
        provider: providerName,
        warnings,
      };
    } catch (err) {
      warnings.push(
        "All upload attempts failed: " +
          (err instanceof Error ? err.message : String(err))
      );
      return {
        hostedUrl: "",
        originalUrl: linkedinUrl,
        provider: this.providers.map((p) => p.name).join(",") || "none",
        warnings,
      };
    }
  }

  // ── Image fetch ─────────────────────────────────────────────

  /**
   * Try direct fetch first. On CORS failure, fall back to
   * MAIN world executeScript which inherits the page's CORS context.
   */
  private async fetchImage(url: string): Promise<Blob> {
    // Attempt 1: Direct fetch from background
    try {
      const response = await fetch(url, { mode: "cors" });
      if (response.ok) {
        return response.blob();
      }
    } catch {
      // CORS blocked -- fall through to MAIN world
    }

    // Attempt 2: MAIN world fetch via executeScript
    return this.fetchImageFromMainWorld(url);
  }

  /**
   * Fetch the image in the page's MAIN world (bypasses CORS)
   * and return the result as a Blob in the service worker.
   */
  private async fetchImageFromMainWorld(url: string): Promise<Blob> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0]?.id;
    if (!tabId) {
      throw new Error("No active tab for MAIN world image fetch");
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN" as const,
      func: buildImageFetcher(url),
    });

    const result = results?.[0]?.result as { base64: string; type: string } | undefined;
    if (!result?.base64) {
      throw new Error("MAIN world image fetch returned no data");
    }

    // Convert base64 back to Blob in the service worker
    const binaryStr = atob(result.base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new Blob([bytes], { type: result.type || "image/jpeg" });
  }

  // ── Validation ──────────────────────────────────────────────

  private validateImage(blob: Blob): string | null {
    if (!ALLOWED_TYPES.includes(blob.type)) {
      return `Invalid image type: ${blob.type || "unknown"}`;
    }
    if (blob.size < MIN_IMAGE_SIZE) {
      return `Image too small: ${blob.size} bytes (min ${MIN_IMAGE_SIZE})`;
    }
    if (blob.size > MAX_IMAGE_SIZE) {
      return `Image too large: ${blob.size} bytes (max ${MAX_IMAGE_SIZE})`;
    }
    return null;
  }

  // ── Upload with fallback chain ──────────────────────────────

  /**
   * Try each provider in the fallback chain.
   * Each provider gets its own retry attempts before moving to the next.
   * Returns the hosted URL and the name of the provider that succeeded.
   */
  private async uploadWithFallback(
    blob: Blob,
    filename: string,
    warnings: string[]
  ): Promise<{ hostedUrl: string; providerName: string }> {
    for (const provider of this.providers) {
      try {
        const url = await this.uploadWithRetryForProvider(provider, blob, filename, warnings);
        return { hostedUrl: url, providerName: provider.name };
      } catch (err) {
        warnings.push(
          `Provider "${provider.name}" exhausted all retries: ${err instanceof Error ? err.message : String(err)}`
        );
        // Continue to next provider in chain
      }
    }

    throw new Error("All providers in the fallback chain failed");
  }

  /**
   * Retry a single provider up to MAX_RETRIES times with exponential backoff.
   */
  private async uploadWithRetryForProvider(
    provider: IImageUploadProvider,
    blob: Blob,
    filename: string,
    warnings: string[]
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await provider.upload(blob, filename);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        warnings.push(
          `[${provider.name}] Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`
        );

        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    throw lastError ?? new Error("Upload failed");
  }

  // ── Helpers ─────────────────────────────────────────────────

  private generateFilename(originalUrl: string): string {
    const ext = this.getExtension(originalUrl);
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    return `profile-${ts}-${rand}${ext}`;
  }

  private getExtension(url: string): string {
    // LinkedIn URLs often have format like ...scale_400_400/...
    // Try to extract extension from URL path
    const match = url.match(/\.(jpe?g|png|webp)/i);
    if (match) {
      return "." + match[1].toLowerCase().replace("jpg", "jpeg");
    }
    return ".jpg"; // default
  }
}

/**
 * Build a self-contained function for executeScript that
 * fetches an image URL and returns base64 + content type.
 */
function buildImageFetcher(imageUrl: string): () => Promise<{ base64: string; type: string }> {
  return async function fetchImageAsBase64() {
    const response = await fetch(imageUrl, { mode: "cors" });
    if (!response.ok) {
      throw new Error(`Image fetch failed: ${response.status}`);
    }
    const blob = await response.blob();
    return new Promise<{ base64: string; type: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // Strip the data:...;base64, prefix
        const base64 = dataUrl.split(",")[1] ?? "";
        resolve({ base64, type: blob.type });
      };
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(blob);
    });
  };
}
