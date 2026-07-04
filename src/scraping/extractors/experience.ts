import type { ExtractorFn, ScraperContext, ExtractorResult } from "../extractor-types";

interface ExperienceData {
  designation: string;
  companyName: string;
}

/**
 * ExperienceExtractor -- finds current job title and company.
 *
 * Primary:   "Experience" h2 section, first item's <p> tags
 * Fallback:  Headline area <p> near nameEl (for designation only)
 */
export const extractExperience: ExtractorFn<ExperienceData> = (
  ctx: ScraperContext
): ExtractorResult<ExperienceData> => {
  const start = performance.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  let designation = "";
  let companyName = "";

  try {
    // --- Primary: Experience section ---
    const headings = ctx.root.querySelectorAll("h2");
    for (const h2 of headings) {
      if ((h2.textContent ?? "").trim() === "Experience") {
        const section = h2.parentElement?.parentElement ?? null;
        if (section) {
          const divs = section.querySelectorAll("div");
          for (const item of divs) {
            const ps = item.querySelectorAll("p");
            if (ps.length >= 2) {
              const p1 = (ps[0].textContent ?? "").trim().replace(/\s+/g, " ");
              const p2 = (ps[1].textContent ?? "").trim().replace(/\s+/g, " ");
              if (p1 && p1.length > 1 && p1.length < 100 && !p1.includes("\u00B7")) {
                designation = p1;
              }
              if (p2 && p2.length > 1 && p2.length < 100) {
                const dotMatch = p2.match(/^(.+?)\s*[\u00B7\u2022]\s*(.+)$/);
                companyName = dotMatch ? dotMatch[1].trim() : p2;
              }
              if (designation || companyName) break;
            }
          }
        }
        break;
      }
    }

    // --- Fallback for designation: headline area ---
    if (!designation && ctx.nameEl) {
      warnings.push("Experience section not found, using headline area fallback for designation");
      let container = ctx.nameEl.parentElement;
      for (let depth = 0; depth < 5 && container; depth++) {
        const ps = container.querySelectorAll(":scope > p");
        for (const p of ps) {
          const t = (p.textContent ?? "").trim().replace(/\s+/g, " ");
          if (
            t &&
            t.length > 5 &&
            t.length < 150 &&
            !t.includes("followers") &&
            !t.includes("connections") &&
            !/^·?\s*(1st|2nd|3rd|[4-9]th)\s*$/i.test(t) &&
            !t.includes(", ")
          ) {
            designation = t;
            break;
          }
        }
        if (designation) break;
        container = container.parentElement;
      }
    }

    if (!designation && !companyName) {
      warnings.push("No experience data found");
    }

    return {
      success: !!(designation || companyName),
      data: { designation, companyName },
      warnings,
      errors,
      timing: performance.now() - start,
    };
  } catch (err) {
    errors.push("ExperienceExtractor threw: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, data: { designation: "", companyName: "" }, warnings, errors, timing: performance.now() - start };
  }
};
