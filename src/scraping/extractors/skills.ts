import type { ExtractorFn, ScraperContext, ExtractorResult } from "../extractor-types";

interface SkillsData {
  skills: string[];
}

/**
 * SkillsExtractor -- finds the profile's listed skills.
 *
 * Primary:   .pv-skill-category-entity__name span (new LinkedIn UI)
 * Fallback 1: button[data-field="skill_card_skill_topic"] span
 * Fallback 2: "Skills" h2 section items
 */
export const extractSkills: ExtractorFn<SkillsData> = (
  ctx: ScraperContext
): ExtractorResult<SkillsData> => {
  const start = performance.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  const skills: string[] = [];

  try {
    // --- Primary: skill entity name spans ---
    const skillEls = ctx.root.querySelectorAll(
      ".pv-skill-category-entity__name span, .pv-skill-category-entity__name-text"
    );
    for (const el of skillEls) {
      const t = (el.textContent ?? "").trim().replace(/\s+/g, " ");
      if (t && t.length > 1 && t.length < 80 && !skills.includes(t)) {
        skills.push(t);
      }
      if (skills.length >= 30) break;
    }

    // --- Fallback 1: skill topic buttons ---
    if (skills.length === 0) {
      warnings.push("Primary skill selectors not found, trying button[data-field] fallback");
      const buttons = ctx.root.querySelectorAll(
        "button[data-field='skill_card_skill_topic'] span, button[data-field*='skill'] span"
      );
      for (const btn of buttons) {
        const t = (btn.textContent ?? "").trim().replace(/\s+/g, " ");
        if (t && t.length > 1 && t.length < 80 && !skills.includes(t)) {
          skills.push(t);
        }
        if (skills.length >= 30) break;
      }
    }

    // --- Fallback 2: Skills h2 section ---
    if (skills.length === 0) {
      warnings.push("Skill buttons not found, trying Skills h2 section");
      const headings = ctx.root.querySelectorAll("h2, h3");
      for (const h of headings) {
        if ((h.textContent ?? "").trim() === "Skills") {
          const section = h.parentElement?.parentElement ?? h.parentElement ?? null;
          if (section) {
            const items = section.querySelectorAll("span, p");
            for (const item of items) {
              const t = (item.textContent ?? "").trim().replace(/\s+/g, " ");
              if (t && t.length > 1 && t.length < 80 && !skills.includes(t) && t !== "Skills") {
                skills.push(t);
              }
              if (skills.length >= 30) break;
            }
          }
          break;
        }
      }
    }

    if (skills.length === 0) {
      warnings.push("No skills found");
    }

    return {
      success: skills.length > 0,
      data: { skills },
      warnings,
      errors,
      timing: performance.now() - start,
    };
  } catch (err) {
    errors.push("SkillsExtractor threw: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, data: { skills: [] }, warnings, errors, timing: performance.now() - start };
  }
};
