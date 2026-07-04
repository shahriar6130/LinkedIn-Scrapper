import type { ExtractorFn, ScraperContext, ExtractorResult } from "../extractor-types";

interface ConnectionData {
  connectionDegree: string;
}

/**
 * ConnectionExtractor -- finds the connection degree (1st, 2nd, 3rd, etc.).
 *
 * Primary:   .distance-badge .visually-hidden (classic)
 * Fallback 1: Walk up from nameEl for degree pattern in spans/buttons
 * Fallback 2: aria-label containing degree info on header area
 */
export const extractConnection: ExtractorFn<ConnectionData> = (
  ctx: ScraperContext
): ExtractorResult<ConnectionData> => {
  const start = performance.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  let connectionDegree = "";

  try {
    // --- Primary: classic distance badge ---
    const badgeEl = ctx.root.querySelector(
      ".pv-top-card--list .distance-badge .visually-hidden, .distance-badge .visually-hidden"
    );
    if (badgeEl) {
      connectionDegree = (badgeEl.textContent ?? "").trim();
    }

    // --- Fallback 1: walk up from nameEl ---
    if (!connectionDegree && ctx.nameEl) {
      warnings.push("Distance badge not found, walking up from nameEl");
      let container: Element | null = ctx.nameEl;
      for (let d = 0; d < 6 && container; d++) {
        const candidates = container.querySelectorAll("span, button");
        for (const cand of candidates) {
          const t = (cand.textContent ?? "").trim();
          const match = t.match(/^(?:·\s*)?(1st|2nd|3rd|[4-9]th)$/i);
          if (match) {
            connectionDegree = match[1];
            break;
          }
        }
        if (connectionDegree) break;
        container = container.parentElement;
      }
    }

    // --- Fallback 2: aria-label with degree ---
    if (!connectionDegree) {
      warnings.push("nameEl walk-up failed, trying aria-label search");
      const ariaEls = ctx.root.querySelectorAll("[aria-label*='degree'], [aria-label*='connection']");
      for (const el of ariaEls) {
        const label = el.getAttribute("aria-label") ?? "";
        const match = label.match(/(1st|2nd|3rd|[4-9]th)/i);
        if (match) {
          connectionDegree = match[1];
          break;
        }
      }
    }

    if (!connectionDegree) {
      warnings.push("No connection degree found");
    }

    return {
      success: !!connectionDegree,
      data: { connectionDegree },
      warnings,
      errors,
      timing: performance.now() - start,
    };
  } catch (err) {
    errors.push("ConnectionExtractor threw: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, data: { connectionDegree: "" }, warnings, errors, timing: performance.now() - start };
  }
};
