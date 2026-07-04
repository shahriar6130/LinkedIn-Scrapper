import type { ExtractorFn, ScraperContext, ExtractorResult } from "../extractor-types";

interface EducationData {
  educations: string; // JSON-encoded array
}

/**
 * EducationExtractor -- collects EVERY education entry.
 *
 * Handles:
 * - Multiple degrees at different institutions
 * - Degree, field of study, institution, timeline, description
 * - Hidden/collapsed sections (after page-loader expansion)
 * - Nested entries (multiple degrees under one institution)
 *
 * Returns JSON-encoded array of education objects.
 */
export const extractEducations: ExtractorFn<EducationData> = (
  ctx: ScraperContext
): ExtractorResult<EducationData> => {
  const start = performance.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  const TIMELINE_REGEX = /\d{4}\s*[-–]\s*(?:\d{4}|Present)|(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}\s*[-–]\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}|Present))/i;

  function clean(text: string | null | undefined): string {
    return (text ?? "").trim().replace(/\s+/g, " ");
  }

  const DEGREE_KEYWORDS = [
    "Bachelor",
    "Master",
    "PhD",
    "Ph.D",
    "Doctor",
    "MBA",
    "Associate",
    "Diploma",
    "Certificate",
    "Certificate of",
    "Bachelor of",
    "Master of",
    "B.S.",
    "B.A.",
    "M.S.",
    "M.A.",
    "BSc",
    "MSc",
    "BEng",
    "MEng",
  ];

  const DEGREE_REGEX = new RegExp(
    `(${DEGREE_KEYWORDS.join("|")})`,
    "i"
  );

  const educations: Array<{
    institute: string;
    degree: string;
    field: string;
    timeline: string;
    description: string;
  }> = [];

  try {
    // Find Education section
    let eduSection: Element | null = null;
    const h2s = ctx.root.querySelectorAll("h2");
    for (const h2 of h2s) {
      if (clean(h2.textContent) === "Education") {
        eduSection =
          h2.closest("section") ??
          h2.parentElement?.parentElement?.parentElement ??
          null;
        break;
      }
    }

    if (!eduSection) {
      // Fallback: itemprop
      const alumniEl = ctx.root.querySelector("[itemprop='alumniOf']");
      if (alumniEl) {
        const name = clean(alumniEl.textContent);
        if (name) {
          educations.push({
            institute: name,
            degree: "",
            field: "",
            timeline: "",
            description: "",
          });
        }
      }

      if (educations.length === 0) warnings.push("Education section not found");
      return {
        success: educations.length > 0,
        data: { educations: JSON.stringify(educations) },
        warnings,
        errors,
        timing: performance.now() - start,
      };
    }

    // Collect all <li> elements
    const items = eduSection.querySelectorAll("li");
    for (const li of items) {
      const allText = clean(li.textContent);
      if (!allText || allText.length < 3) continue;

      const spans = li.querySelectorAll("span, p");
      if (spans.length < 1) continue;

      let institute = "";
      let degree = "";
      let field = "";
      let timeline = "";
      let description = "";

      for (let i = 0; i < spans.length; i++) {
        const t = clean(spans[i].textContent);

        // Institution: first short text without degree keywords
        if (
          !institute &&
          t.length > 2 &&
          t.length < 150 &&
          !t.includes("·") &&
          !DEGREE_REGEX.test(t) &&
          !TIMELINE_REGEX.test(t)
        ) {
          institute = t;
          continue;
        }

        // Degree line: may contain "Degree, Field" or "Degree · Field"
        if (!degree && (DEGREE_REGEX.test(t) || (t.length > 3 && t.length < 150))) {
          const parts = t.split(/\s*[·•,]\s*/);
          if (parts.length >= 1 && (DEGREE_REGEX.test(parts[0]) || parts[0].length < 80)) {
            degree = parts[0].trim();
            if (parts.length >= 2) {
              field = parts.slice(1).join(", ").trim();
            }
            // Check if this text is actually a timeline
            if (TIMELINE_REGEX.test(t)) continue;
            continue;
          }
        }

        // Timeline
        if (!timeline && TIMELINE_REGEX.test(t)) {
          timeline = t;
          continue;
        }

        // Description: longer text after all metadata
        if (
          !description &&
          t.length > 20 &&
          t.length < 500 &&
          institute &&
          !DEGREE_REGEX.test(t) &&
          !TIMELINE_REGEX.test(t)
        ) {
          description = t;
        }
      }

      if (institute || degree) {
        educations.push({ institute, degree, field, timeline, description });
      }
    }

    if (educations.length === 0) {
      warnings.push("Education section found but no entries extracted");
    }

    return {
      success: educations.length > 0,
      data: { educations: JSON.stringify(educations) },
      warnings,
      errors,
      timing: performance.now() - start,
    };
  } catch (err) {
    errors.push(
      "EducationExtractor threw: " +
        (err instanceof Error ? err.message : String(err))
    );
    return {
      success: false,
      data: { educations: "[]" },
      warnings,
      errors,
      timing: performance.now() - start,
    };
  }
};
