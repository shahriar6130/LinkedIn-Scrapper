import type { ExtractorFn, ScraperContext, ExtractorResult } from "../extractor-types";

interface ProfileData {
  name: string;
  profileLink: string;
}

/**
 * ProfileExtractor -- finds the profile name and canonical URL.
 *
 * Primary:   h1 tag (public profiles, classic view)
 * Fallback:  h2 tags with name-like heuristics (logged-in redesign)
 * Last:      URL slug extraction
 */
export const extractProfile: ExtractorFn<ProfileData> = (
  ctx: ScraperContext
): ExtractorResult<ProfileData> => {
  const start = performance.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  let name = "";

  try {
    // --- Primary: h1 ---
    const h1 = ctx.root.querySelector("h1");
    if (h1) {
      const text = (h1.textContent ?? "").trim().replace(/\s+/g, " ");
      if (text.length > 2 && text.length < 60 && !text.includes("notification")) {
        name = text;
      }
    }

    // --- Fallback: h2 with name heuristics ---
    if (!name) {
      warnings.push("h1 not found, falling back to h2 scan");
      const h2s = ctx.root.querySelectorAll("h2");
      for (const h2 of h2s) {
        const text = (h2.textContent ?? "").trim().replace(/\s+/g, " ");
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
          // Store the name element in context for other extractors
          ctx.nameEl = h2;
          break;
        }
      }
    } else {
      ctx.nameEl = h1;
    }

    // --- Last resort: URL slug ---
    if (!name) {
      warnings.push("No name element found, attempting URL slug extraction");
      const match = window.location.href.match(/linkedin\.com\/in\/([^/?]+)/i);
      if (match) {
        name = decodeURIComponent(match[1]).replace(/-/g, " ");
        // Basic validation: should look like a name (2+ words, letters)
        if (!/^[A-Za-z\s'\-\.]+$/.test(name) || name.split(/\s+/).length < 2) {
          name = "";
          errors.push("URL slug did not look like a valid name");
        }
      }
    }

    if (!name) {
      errors.push("Could not extract profile name from DOM");
    }

    const profileLink = window.location.href.split("?")[0];

    return {
      success: !!name,
      data: { name, profileLink },
      warnings,
      errors,
      timing: performance.now() - start,
    };
  } catch (err) {
    errors.push("ProfileExtractor threw: " + (err instanceof Error ? err.message : String(err)));
    return {
      success: false,
      data: { name: "", profileLink: window.location.href.split("?")[0] },
      warnings,
      errors,
      timing: performance.now() - start,
    };
  }
};
