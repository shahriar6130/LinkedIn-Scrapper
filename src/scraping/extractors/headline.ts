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
      ".text-body-medium.break-words, .display-flex .text-body-medium, [data-generated-suggestion-target] .text-body-medium, h2 + div .text-body-medium, .pv-top-card--list li .text-body-medium"
    );
    if (primary) {
      const text = (primary.textContent ?? "").trim().replace(/\s+/g, " ");
      if (text.length > 2 && text.length < 200) {
        headline = text;
      }
    }

    // --- Fallback 1: walk up from nameEl for first qualifying <p> or <span> ---
    if (!headline && ctx.nameEl) {
      warnings.push("Primary headline selectors not found, using fallback");
      let container = ctx.nameEl.parentElement;
      for (let depth = 0; depth < 8 && container; depth++) {
        // Check direct children that could be headline
        const children = container.querySelectorAll(":scope > p, :scope > span, :scope > div > span, :scope > div > p");
        for (const child of children) {
          const t = (child.textContent ?? "").trim().replace(/\s+/g, " ");
          if (
            t &&
            t.length > 5 &&
            t.length < 200 &&
            !t.includes("followers") &&
            !t.includes("connections") &&
            !/^·?\s*(1st|2nd|3rd|[4-9]th)\s*$/i.test(t) &&
            !/^\d+\s*\.?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(t) &&
            !/\d{4}\s*[-–]/.test(t) // skip timeline patterns
          ) {
            headline = t;
            break;
          }
        }
        if (headline) break;
        container = container.parentElement;
      }
    }

    // --- Fallback 2: look for text after name in common structures ---
    if (!headline) {
      warnings.push("Headline fallback 1 failed, trying structure-based search");
      // LinkedIn often puts headline in a div/span right after the name
      const nameParent = ctx.nameEl?.parentElement;
      if (nameParent) {
        const siblings = nameParent.querySelectorAll("span, p, div");
        for (const sib of siblings) {
          const t = (sib.textContent ?? "").trim().replace(/\s+/g, " ");
          if (
            t &&
            t.length > 10 &&
            t.length < 200 &&
            !t.includes("followers") &&
            !t.includes("connections") &&
            !/\d{4}\s*[-–]/.test(t) &&
            !/^\s*[·•]\s*$/.test(t)
          ) {
            headline = t;
            break;
          }
        }
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
