import type { ExtractorFn, ScraperContext, ExtractorResult } from "../extractor-types";

interface LocationData {
  location: string;
}

/**
 * LocationExtractor -- finds the profile location.
 *
 * Primary:   <p> near nameEl matching location patterns (contains ", " or city/country keywords)
 * Fallback:  Classic selectors: .text-body-small.inline, [itemprop='address']
 */
export const extractLocation: ExtractorFn<LocationData> = (
  ctx: ScraperContext
): ExtractorResult<LocationData> => {
  const start = performance.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  let location = "";

  try {
    // --- Primary: walk up from nameEl for location-pattern text ---
    if (ctx.nameEl) {
      let container = ctx.nameEl.parentElement;
      for (let depth = 0; depth < 8 && container; depth++) {
        const ps = container.querySelectorAll(":scope > p, :scope > span, :scope > div > span, :scope > div > p");
        for (const p of ps) {
          const t = (p.textContent ?? "").trim().replace(/\s+/g, " ");
          if (
            t &&
            t.length > 3 &&
            t.length < 80 &&
            (t.includes(", ") || /city|country|region|division|united states|kingdom|india|canada|australia/i.test(t)) &&
            !t.includes("followers") &&
            !t.includes("connections") &&
            !/^·?\s*(1st|2nd|3rd|[4-9]th)\s*$/i.test(t) &&
            !/\d{4}\s*[-–]/.test(t) // skip timeline patterns
          ) {
            location = t;
            break;
          }
        }
        if (location) break;
        container = container.parentElement;
      }
    }

    // --- Fallback: classic selectors ---
    if (!location) {
      warnings.push("Location not found near nameEl, trying classic selectors");
      const classicEl = ctx.root.querySelector(
        ".text-body-small.inline, [itemprop='address'], .profile-info-subheader > span, .pv-top-card--list li span"
      );
      if (classicEl) {
        const t = (classicEl.textContent ?? "").trim().replace(/\s+/g, " ");
        if (t.includes(", ") || /city|country|region/i.test(t)) {
          location = t;
        }
      }
    }

    // --- Fallback 2: look for location-like text near profile header ---
    if (!location) {
      warnings.push("Classic selectors failed, trying header area search");
      const headerArea = ctx.root.querySelector(".pv-top-card, main > div > div:first-child");
      if (headerArea) {
        const allText = headerArea.querySelectorAll("span, p");
        for (const el of allText) {
          const t = (el.textContent ?? "").trim().replace(/\s+/g, " ");
          if (
            t &&
            t.length > 5 &&
            t.length < 80 &&
            t.includes(", ") &&
            !t.includes("followers") &&
            !t.includes("connections") &&
            !/\d{4}\s*[-–]/.test(t) &&
            /[A-Z][a-z]+,\s*[A-Z]/.test(t) // matches "City, State" pattern
          ) {
            location = t;
            break;
          }
        }
      }
    }

    if (!location) {
      warnings.push("No location found");
    }

    return {
      success: !!location,
      data: { location },
      warnings,
      errors,
      timing: performance.now() - start,
    };
  } catch (err) {
    errors.push("LocationExtractor threw: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, data: { location: "" }, warnings, errors, timing: performance.now() - start };
  }
};
