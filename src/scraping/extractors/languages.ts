import type { ExtractorFn, ScraperContext, ExtractorResult } from "../extractor-types";

interface LanguagesData {
  languages: string[];
}

/**
 * LanguagesExtractor -- extracts languages from the Languages section.
 *
 * Handles:
 * - "Languages" h2/h3 section
 * - Multiple language entries
 * - Proficiency levels (stripped)
 * - Missing section returns empty array (never fails)
 */
export const extractLanguages: ExtractorFn<LanguagesData> = (
  ctx: ScraperContext
): ExtractorResult<LanguagesData> => {
  const start = performance.now();
  const warnings: string[] = [];

  function clean(text: string | null | undefined): string {
    return (text ?? "").trim().replace(/\s+/g, " ");
  }

  const languages: string[] = [];

  // Find Languages section
  let langSection: Element | null = null;
  const headings = ctx.root.querySelectorAll("h2, h3");
  for (const h of headings) {
    if (clean(h.textContent) === "Languages") {
      langSection =
        h.closest("section") ??
        h.parentElement?.parentElement ??
        null;
      break;
    }
  }

  if (!langSection) {
    // Fallback: structured data
    const langEls = ctx.root.querySelectorAll("[itemprop='knowsLanguage']");
    for (const el of langEls) {
      const t = clean(el.textContent);
      if (t && t.length > 1 && t.length < 60 && !languages.includes(t)) {
        languages.push(t);
      }
    }

    if (languages.length === 0) {
      warnings.push("Languages section not found");
    }

    return {
      success: languages.length > 0,
      data: { languages },
      warnings,
      errors: [],
      timing: performance.now() - start,
    };
  }

  // Collect language entries
  const items = langSection.querySelectorAll("li, span, p");
  for (const el of items) {
    const t = clean(el.textContent);
    if (!t || t.length < 2 || t.length > 80) continue;
    if (t === "Languages") continue;

    // Strip proficiency suffixes like "Native or bilingual proficiency"
    const langName = t
      .replace(/\s*[-–—]\s*(Native|Professional|Elementary|Limited|Intermediate|Fluent|Beginner).*$/i, "")
      .replace(/\s*\((Native|Professional|Elementary|Limited|Intermediate|Fluent|Beginner).*$/i, ")")
      .replace(/\s+/g, " ")
      .trim();

    if (
      langName.length > 1 &&
      langName.length < 40 &&
      !languages.includes(langName) &&
      !/^(Native|Professional|Elementary|Limited|Intermediate|Fluent|Beginner)/i.test(langName)
    ) {
      languages.push(langName);
    }
  }

  if (languages.length === 0) {
    warnings.push("Languages section found but no entries extracted");
  }

  return {
    success: languages.length > 0,
    data: { languages },
    warnings,
    errors: [],
    timing: performance.now() - start,
  };
};
