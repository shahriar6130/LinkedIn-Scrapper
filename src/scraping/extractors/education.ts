import type { ExtractorFn, ScraperContext, ExtractorResult } from "../extractor-types";

interface EducationData {
  educationInstitute: string;
  degree: string;
  educationTimeline: string;
}

/**
 * EducationExtractor -- finds education details.
 *
 * Primary:   "Education" h2 section, first item's <p> tags
 * Fallback:  [itemprop="alumniOf"] attribute, classic selectors
 */
export const extractEducation: ExtractorFn<EducationData> = (
  ctx: ScraperContext
): ExtractorResult<EducationData> => {
  const start = performance.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  let educationInstitute = "";
  let degree = "";
  let educationTimeline = "";

  try {
    // --- Primary: Education section ---
    const headings = ctx.root.querySelectorAll("h2");
    for (const h2 of headings) {
      if ((h2.textContent ?? "").trim() === "Education") {
        const section = h2.parentElement?.parentElement ?? null;
        if (section) {
          const divs = section.querySelectorAll("div");
          for (const item of divs) {
            const ps = item.querySelectorAll("p");
            if (ps.length >= 2) {
              const p1 = (ps[0].textContent ?? "").trim().replace(/\s+/g, " ");
              const p2 = (ps[1].textContent ?? "").trim().replace(/\s+/g, " ");
              const p3 = ps.length >= 3 ? (ps[2].textContent ?? "").trim().replace(/\s+/g, " ") : "";
              if (p1 && p1.length > 3 && p1.length < 120) educationInstitute = p1;
              if (p2 && p2.length > 1 && p2.length < 100 && !p2.match(/^\d{4}/)) degree = p2;
              if (p3 && /\d{4}/.test(p3)) educationTimeline = p3;
              if (educationInstitute || degree) break;
            }
          }
        }
        break;
      }
    }

    // --- Fallback: structured data / classic selectors ---
    if (!educationInstitute) {
      warnings.push("Education section not found, trying fallback selectors");
      const alumniEl = ctx.root.querySelector("[itemprop='alumniOf']");
      if (alumniEl) {
        educationInstitute = (alumniEl.textContent ?? "").trim().replace(/\s+/g, " ");
      }
    }

    if (!educationInstitute && !degree) {
      warnings.push("No education data found");
    }

    return {
      success: !!(educationInstitute || degree),
      data: { educationInstitute, degree, educationTimeline },
      warnings,
      errors,
      timing: performance.now() - start,
    };
  } catch (err) {
    errors.push("EducationExtractor threw: " + (err instanceof Error ? err.message : String(err)));
    return {
      success: false,
      data: { educationInstitute: "", degree: "", educationTimeline: "" },
      warnings,
      errors,
      timing: performance.now() - start,
    };
  }
};
