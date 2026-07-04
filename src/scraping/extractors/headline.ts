import type { ExtractorFn, ScraperContext, ExtractorResult } from "../extractor-types";

interface HeadlineData {
  headline: string;
}

/**
 * HeadlineExtractor -- finds the profile headline / tagline.
 *
 * Primary:   .text-body-medium element near the name
 * Fallback:  First <p> near nameEl that isn't location, connections, or followers
 */
export const extractHeadline: ExtractorFn<HeadlineData> = (
  ctx: ScraperContext
): ExtractorResult<HeadlineData> => {
  const start = performance.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  let headline = "";

  try {
    // --- Primary: known headline selectors ---
    const primary = ctx.root.querySelector(
      ".text-body-medium.break-words, .display-flex .text-body-medium, [data-generated-suggestion-target] .text-body-medium"
    );
    if (primary) {
      const text = (primary.textContent ?? "").trim().replace(/\s+/g, " ");
      if (text.length > 2 && text.length < 200) {
        headline = text;
      }
    }

    // --- Fallback: walk up from nameEl for first qualifying <p> ---
    if (!headline && ctx.nameEl) {
      warnings.push("Primary headline selectors not found, using fallback");
      let container = ctx.nameEl.parentElement;
      for (let depth = 0; depth < 5 && container; depth++) {
        const ps = container.querySelectorAll(":scope > p");
        for (const p of ps) {
          const t = (p.textContent ?? "").trim().replace(/\s+/g, " ");
          if (
            t &&
            t.length > 5 &&
            t.length < 200 &&
            !t.includes("followers") &&
            !t.includes("connections") &&
            !/^·?\s*(1st|2nd|3rd|[4-9]th)\s*$/i.test(t) &&
            !t.includes(", ") // skip location-like text
          ) {
            headline = t;
            break;
          }
        }
        if (headline) break;
        container = container.parentElement;
      }
    }

    if (!headline) {
      warnings.push("No headline found");
    }

    return {
      success: !!headline,
      data: { headline },
      warnings,
      errors,
      timing: performance.now() - start,
    };
  } catch (err) {
    errors.push("HeadlineExtractor threw: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, data: { headline: "" }, warnings, errors, timing: performance.now() - start };
  }
};
