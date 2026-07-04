import type { ExtractorFn, ScraperContext, ExtractorResult } from "../extractor-types";

interface IndustryData {
  industry: string;
}

/**
 * IndustryExtractor -- finds the profile's industry.
 *
 * Primary:   .pv-top-card--industry (classic), [data-field*='industry']
 * Fallback 1: Industry text near headline area
 * Fallback 2: "Contact and personal info" or header section industry line
 */
export const extractIndustry: ExtractorFn<IndustryData> = (
  ctx: ScraperContext
): ExtractorResult<IndustryData> => {
  const start = performance.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  let industry = "";

  try {
    // --- Primary: classic industry selectors ---
    const industryEl = ctx.root.querySelector(
      ".pv-top-card--industry, [data-field='industry'], .text-body-small [data-field*='industry']"
    );
    if (industryEl) {
      industry = (industryEl.textContent ?? "").trim().replace(/\s+/g, " ");
    }

    // --- Fallback 1: industry link or text in header area ---
    if (!industry && ctx.nameEl) {
      warnings.push("Primary industry selectors not found, trying header area");
      let container: Element | null = ctx.nameEl;
      for (let d = 0; d < 6 && container; d++) {
        // Look for links or spans that look like industry names
        const candidates = container.querySelectorAll("a[href*='/industry/'], span.text-body-small");
        for (const c of candidates) {
          const t = (c.textContent ?? "").trim().replace(/\s+/g, " ");
          if (
            t &&
            t.length > 3 &&
            t.length < 80 &&
            !t.includes("connections") &&
            !t.includes("followers") &&
            !/^\d/.test(t)
          ) {
            industry = t;
            break;
          }
        }
        if (industry) break;
        container = container.parentElement;
      }
    }

    // --- Fallback 2: any element with "Industry" label nearby ---
    if (!industry) {
      warnings.push("Header area fallback failed, trying label-based search");
      const allSpans = ctx.root.querySelectorAll("span, p, div");
      for (const el of allSpans) {
        const t = (el.textContent ?? "").trim().replace(/\s+/g, " ");
        if (t === "Industry") {
          // The next sibling or parent's next child often has the value
          const next = el.nextElementSibling ?? el.parentElement?.querySelector(":scope > span:last-child");
          if (next && next !== el) {
            const val = (next.textContent ?? "").trim().replace(/\s+/g, " ");
            if (val && val.length > 2 && val.length < 80 && val !== "Industry") {
              industry = val;
              break;
            }
          }
        }
      }
    }

    if (!industry) {
      warnings.push("No industry found");
    }

    return {
      success: !!industry,
      data: { industry },
      warnings,
      errors,
      timing: performance.now() - start,
    };
  } catch (err) {
    errors.push("IndustryExtractor threw: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, data: { industry: "" }, warnings, errors, timing: performance.now() - start };
  }
};
