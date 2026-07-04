import type { ExtractorFn, ScraperContext, ExtractorResult } from "../extractor-types";

interface AboutData {
  about: string;
}

/**
 * AboutExtractor -- finds the About section summary text.
 *
 * Primary:   .pv-about-section .pv-about__summary-text
 * Fallback 1: #about anchor + sibling/parent content div
 * Fallback 2: "About" h2 section first <p>
 */
export const extractAbout: ExtractorFn<AboutData> = (
  ctx: ScraperContext
): ExtractorResult<AboutData> => {
  const start = performance.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  let about = "";

  try {
    // --- Primary: classic about section ---
    const aboutEl = ctx.root.querySelector(
      ".pv-about-section .pv-about__summary-text, .pv-about__summary-text"
    );
    if (aboutEl) {
      about = (aboutEl.textContent ?? "").trim().replace(/\s+/g, " ");
    }

    // --- Fallback 1: #about anchor ---
    if (!about) {
      warnings.push("Primary about selectors not found, trying #about anchor");
      const aboutAnchor = ctx.root.querySelector("#about");
      if (aboutAnchor) {
        const section = aboutAnchor.closest("section") ?? aboutAnchor.parentElement?.parentElement;
        if (section) {
          const ps = section.querySelectorAll("p, span.text-body-small");
          for (const p of ps) {
            const t = (p.textContent ?? "").trim().replace(/\s+/g, " ");
            if (t.length > 20) {
              about = t;
              break;
            }
          }
        }
      }
    }

    // --- Fallback 2: "About" h2 section ---
    if (!about) {
      warnings.push("#about anchor not found, trying h2 section");
      const headings = ctx.root.querySelectorAll("h2, h3");
      for (const h of headings) {
        if ((h.textContent ?? "").trim() === "About") {
          const section = h.parentElement?.parentElement ?? h.parentElement ?? null;
          if (section) {
            const ps = section.querySelectorAll("p, span");
            for (const p of ps) {
              const t = (p.textContent ?? "").trim().replace(/\s+/g, " ");
              if (t.length > 20) {
                about = t;
                break;
              }
            }
          }
          break;
        }
      }
    }

    if (!about) {
      warnings.push("No about section found");
    }

    return {
      success: !!about,
      data: { about },
      warnings,
      errors,
      timing: performance.now() - start,
    };
  } catch (err) {
    errors.push("AboutExtractor threw: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, data: { about: "" }, warnings, errors, timing: performance.now() - start };
  }
};
