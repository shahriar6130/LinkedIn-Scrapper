import type { ExtractorFn, ScraperContext, ExtractorResult } from "../extractor-types";

interface ImageData {
  profilePicture: string;
}

/**
 * ImageExtractor -- finds the profile picture URL.
 *
 * Primary:   img[src*='profile-displayphoto'] near nameEl (min 150x150)
 * Fallback:  Largest profile-displayphoto image on the entire page
 * Post:      Upgrade resolution to scale_400_400
 */
export const extractImage: ExtractorFn<ImageData> = (
  ctx: ScraperContext
): ExtractorResult<ImageData> => {
  const start = performance.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  let profilePicture = "";

  try {
    // --- Primary: near nameEl ---
    if (ctx.nameEl) {
      let cardContainer: Element | null = ctx.nameEl;
      for (let d = 0; d < 6 && cardContainer; d++) {
        const imgs = cardContainer.querySelectorAll("img[src*='profile-displayphoto'], img[data-delayed-url*='profile-displayphoto']");
        for (const img of imgs) {
          const el = img as HTMLImageElement;
          // Get src from either src attribute or data-delayed-url (LinkedIn lazy loading)
          const src = el.src || el.getAttribute("data-delayed-url") || "";
          if (src && !src.includes("emoji") && src.includes("profile-displayphoto")) {
            profilePicture = src;
            break;
          }
        }
        if (profilePicture) break;
        cardContainer = cardContainer.parentElement;
      }
    }

    // --- Fallback: largest on page ---
    if (!profilePicture) {
      warnings.push("No profile image near nameEl, scanning entire page");
      const allImgs = ctx.root.querySelectorAll("img[src*='profile-displayphoto'], img[data-delayed-url*='profile-displayphoto']");
      let bestSrc = "";
      let bestArea = 0;
      for (const img of allImgs) {
        const el = img as HTMLImageElement;
        const src = el.src || el.getAttribute("data-delayed-url") || "";
        if (src && !src.includes("emoji") && src.includes("profile-displayphoto")) {
          // Use natural dimensions if available, otherwise assume large image
          const area = (el.naturalWidth || 400) * (el.naturalHeight || 400);
          if (area > bestArea) {
            bestArea = area;
            bestSrc = src;
          }
        }
      }
      if (bestSrc) profilePicture = bestSrc;
    }

    // --- Post-process: upgrade resolution ---
    if (profilePicture) {
      profilePicture = profilePicture
        .replace(/shrink_\d+_\d+/, "scale_400_400")
        .replace(/scale_\d+_\d+/, "scale_400_400");
    }

    if (!profilePicture) {
      warnings.push("No profile picture found");
    }

    return {
      success: !!profilePicture,
      data: { profilePicture },
      warnings,
      errors,
      timing: performance.now() - start,
    };
  } catch (err) {
    errors.push("ImageExtractor threw: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, data: { profilePicture: "" }, warnings, errors, timing: performance.now() - start };
  }
};
