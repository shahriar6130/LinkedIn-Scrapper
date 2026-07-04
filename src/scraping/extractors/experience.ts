import type { ExtractorFn, ScraperContext, ExtractorResult } from "../extractor-types";

interface ExperienceData {
  experiences: string; // JSON-encoded array
}

/**
 * ExperienceExtractor -- collects EVERY work experience entry.
 *
 * Handles:
 * - Single roles
 * - Nested/grouped companies (multiple roles under one company)
 * - Hidden sections (after page-loader expansion)
 * - Employment type, dates, duration, location
 *
 * Returns JSON-encoded array of experience objects.
 */
export const extractExperiences: ExtractorFn<ExperienceData> = (
  ctx: ScraperContext
): ExtractorResult<ExperienceData> => {
  const start = performance.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  const EMPLOYMENT_TYPES = [
    "Full-time",
    "Part-time",
    "Contract",
    "Temporary",
    "Freelance",
    "Self-employed",
    "Internship",
    "Apprenticeship",
    "Seasonal",
  ];

  const EMPLOYMENT_REGEX = new RegExp(
    `(${EMPLOYMENT_TYPES.join("|")})`,
    "i"
  );

  const DATE_REGEX = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}\s*[-–]\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}\s*[-–]\s*Present|\d{4}\s*[-–]\s*(?:\d{4}|Present)/i;

  function clean(text: string | null | undefined): string {
    return (text ?? "").trim().replace(/\s+/g, " ");
  }

  function isCurrentRole(end: string): boolean {
    return /present/i.test(end) || !end || end === "–";
  }

  function parseDates(text: string): {
    start: string;
    end: string;
    duration: string;
    employmentType: string;
  } {
    let start = "";
    let end = "";
    let duration = "";
    let employmentType = "";

    // Employment type
    const empMatch = text.match(EMPLOYMENT_REGEX);
    if (empMatch) employmentType = empMatch[1];

    // Duration (e.g., "2 yrs 3 mos", "1 yr")
    const durMatch = text.match(/\d+\s+(?:yr|year|mo|month)s?[^,·\n]*/i);
    if (durMatch) duration = durMatch[0].trim();

    // Date range
    const dateMatch = text.match(DATE_REGEX);
    if (dateMatch) {
      const dateStr = dateMatch[0];
      const rangeParts = dateStr.split(/\s*[-–]\s*/);
      if (rangeParts.length === 2) {
        start = rangeParts[0].trim();
        end = rangeParts[1].trim();
      } else {
        start = dateStr.trim();
      }
    }

    return { start, end, duration, employmentType };
  }

  const experiences: Array<{
    title: string;
    company: string;
    employmentType: string;
    start: string;
    end: string;
    duration: string;
    current: boolean;
    location: string;
  }> = [];

  try {
    // Find the "Experience" section
    let experienceSection: Element | null = null;
    const allH2s = ctx.root.querySelectorAll("h2");
    for (const h2 of allH2s) {
      if (clean(h2.textContent) === "Experience") {
        experienceSection =
          h2.closest("section") ??
          h2.closest("[data-id]") ??
          h2.parentElement?.parentElement?.parentElement ??
          null;
        break;
      }
    }

    if (!experienceSection) {
      warnings.push("Experience section not found");
      return {
        success: false,
        data: { experiences: "[]" },
        warnings,
        errors,
        timing: performance.now() - start,
      };
    }

    // Collect all <li> elements within the experience section
    const items = experienceSection.querySelectorAll("li");

    for (const li of items) {
      // Skip empty or decorative list items
      const allText = clean(li.textContent);
      if (!allText || allText.length < 5) continue;

      // Try to extract the role from the first span or link
      const spans = li.querySelectorAll("span, p");
      if (spans.length < 2) continue;

      // First meaningful span is typically the title
      let title = "";
      let company = "";
      let metaText = "";
      let location = "";

      for (let i = 0; i < spans.length; i++) {
        const t = clean(spans[i].textContent);

        // Title: first short text without bullet
        if (!title && t.length > 1 && t.length < 120 && !t.includes("·") && !t.includes("Present") && !EMPLOYMENT_REGEX.test(t) && !DATE_REGEX.test(t)) {
          title = t;
          continue;
        }

        // Company: next text after title (may have · separator)
        if (title && !company && t.length > 1 && t.length < 120) {
          const dotMatch = t.match(/^(.+?)\s*[·•]\s*(.+)$/);
          if (dotMatch) {
            company = dotMatch[1].trim();
            metaText = dotMatch[2].trim();
          } else if (!t.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i) && !EMPLOYMENT_REGEX.test(t) && !/^\d+\s+(yr|mo)/i.test(t)) {
            company = t;
          }
          continue;
        }

        // Meta line with dates, employment type, duration
        if (!metaText && (DATE_REGEX.test(t) || EMPLOYMENT_REGEX.test(t))) {
          metaText = t;
          continue;
        }

        // Location: typically after "·" or at the end
        if (!location && (t.includes(",") || /city|region|remote|hybrid/i.test(t)) && t.length < 80 && !DATE_REGEX.test(t)) {
          location = t;
        }
      }

      // Parse dates and metadata
      const { start, end, duration, employmentType } = parseDates(metaText);

      if (title || company) {
        experiences.push({
          title,
          company,
          employmentType,
          start,
          end,
          duration,
          current: isCurrentRole(end),
          location,
        });
      }
    }

    if (experiences.length === 0) {
      warnings.push("Experience section found but no entries extracted");
    }

    return {
      success: experiences.length > 0,
      data: { experiences: JSON.stringify(experiences) },
      warnings,
      errors,
      timing: performance.now() - start,
    };
  } catch (err) {
    errors.push(
      "ExperienceExtractor threw: " +
        (err instanceof Error ? err.message : String(err))
    );
    return {
      success: false,
      data: { experiences: "[]" },
      warnings,
      errors,
      timing: performance.now() - start,
    };
  }
};
