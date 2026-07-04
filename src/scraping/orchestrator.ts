/**
 * Orchestrator -- composes all extractors into a self-contained scraper function.
 *
 * Because chrome.scripting.executeScript({ world: "MAIN" }) serializes only the
 * function body (not its enclosing scope), buildProfileScraper() returns a closure
 * that contains ALL logic inlined: DOM helpers, extractors, and the orchestration loop.
 *
 * The individual extractor files in src/scraping/extractors/ serve as the canonical,
 * type-checked reference implementations. The orchestrator mirrors their logic in a
 * self-contained function suitable for MAIN world injection.
 */

import type { ProfileScrapeResult } from "@/models";

/**
 * Build a self-contained scraper function for chrome.scripting.executeScript.
 * The returned function has zero external dependencies.
 */
export function buildProfileScraper(): () => ProfileScrapeResult & {
  warnings: string[];
  errors: string[];
  timing: number;
} {
  return function scrapeProfileFromDOM() {
    // ================================================================
    // DOM Helpers (inlined for self-containment)
    // ================================================================

    function clean(text: string | null | undefined): string {
      if (!text) return "";
      return text.trim().replace(/\s+/g, " ");
    }

    function safeRun(
      name: string,
      fn: () => { data: Record<string, string | string[]>; warnings: string[]; errors: string[] }
    ): { data: Record<string, string | string[]>; warnings: string[]; errors: string[]; timing: number } {
      const start = performance.now();
      try {
        const result = fn();
        return { ...result, timing: performance.now() - start };
      } catch (err) {
        return {
          data: {},
          warnings: [],
          errors: [`${name} threw: ${err instanceof Error ? err.message : String(err)}`],
          timing: performance.now() - start,
        };
      }
    }

    // ================================================================
    // Shared state
    // ================================================================
    let nameEl: Element | null = null;
    const allWarnings: string[] = [];
    const allErrors: string[] = [];
    const totalStart = performance.now();
    const data: Record<string, string | string[]> = {};

    // ================================================================
    // Extractor 1: ProfileExtractor (name + profileLink)
    // ================================================================
    {
      const r = safeRun("ProfileExtractor", () => {
        const warnings: string[] = [];
        const errors: string[] = [];
        let name = "";

        // Primary: h1
        const h1 = document.querySelector("h1");
        if (h1) {
          const text = clean(h1.textContent);
          if (text.length > 2 && text.length < 60 && !text.includes("notification")) {
            name = text;
          }
        }

        // Fallback: h2 with name heuristics
        if (!name) {
          warnings.push("h1 not found, falling back to h2 scan");
          const h2s = document.querySelectorAll("h2");
          for (const h2 of h2s) {
            const text = clean(h2.textContent);
            if (
              text.length > 2 && text.length < 60 &&
              /^[A-Za-z\s'\-\.]+$/.test(text) && text.split(/\s+/).length >= 2 &&
              !text.includes("notification") && !text.includes("About") &&
              !text.includes("Activity") && !text.includes("Experience") && !text.includes("Education")
            ) {
              name = text;
              nameEl = h2;
              break;
            }
          }
        } else {
          nameEl = h1;
        }

        // Last resort: URL slug
        if (!name) {
          warnings.push("No name element found, attempting URL slug extraction");
          const match = window.location.href.match(/linkedin\.com\/in\/([^/?]+)/i);
          if (match) {
            const slug = decodeURIComponent(match[1]).replace(/-/g, " ");
            if (/^[A-Za-z\s'\-\.]+$/.test(slug) && slug.split(/\s+/).length >= 2) {
              name = slug;
            } else {
              errors.push("URL slug did not look like a valid name");
            }
          }
        }

        if (!name) errors.push("Could not extract profile name from DOM");

        return {
          data: { name, profileLink: window.location.href.split("?")[0] },
          warnings,
          errors,
        };
      });
      Object.assign(data, r.data);
      allWarnings.push(...r.warnings);
      allErrors.push(...r.errors);
    }

    // ================================================================
    // Extractor 2: HeadlineExtractor
    // ================================================================
    {
      const r = safeRun("HeadlineExtractor", () => {
        const warnings: string[] = [];
        let headline = "";

        // Primary: known selectors
        const primary = document.querySelector(
          ".text-body-medium.break-words, .display-flex .text-body-medium"
        );
        if (primary) {
          const text = clean(primary.textContent);
          if (text.length > 2 && text.length < 200) headline = text;
        }

        // Fallback: walk up from nameEl
        if (!headline && nameEl) {
          warnings.push("Primary headline selectors not found, using fallback");
          let container = nameEl.parentElement;
          for (let depth = 0; depth < 5 && container; depth++) {
            const ps = container.querySelectorAll(":scope > p");
            for (const p of ps) {
              const t = clean(p.textContent);
              if (
                t.length > 5 && t.length < 200 &&
                !t.includes("followers") && !t.includes("connections") &&
                !/^·?\s*(1st|2nd|3rd|[4-9]th)\s*$/i.test(t) && !t.includes(", ")
              ) {
                headline = t;
                break;
              }
            }
            if (headline) break;
            container = container.parentElement;
          }
        }

        if (!headline) warnings.push("No headline found");
        return { data: { headline }, warnings, errors: [] };
      });
      Object.assign(data, r.data);
      allWarnings.push(...r.warnings);
      allErrors.push(...r.errors);
    }

    // ================================================================
    // Extractor 3: ImageExtractor
    // ================================================================
    {
      const r = safeRun("ImageExtractor", () => {
        const warnings: string[] = [];
        let profilePicture = "";

        // Primary: near nameEl
        if (nameEl) {
          let card: Element | null = nameEl;
          for (let d = 0; d < 6 && card; d++) {
            const imgs = card.querySelectorAll("img[src*='profile-displayphoto']");
            for (const img of imgs) {
              const el = img as HTMLImageElement;
              if (el.src && !el.src.includes("emoji") &&
                  (el.naturalWidth || 0) >= 150 && (el.naturalHeight || 0) >= 150) {
                profilePicture = el.src;
                break;
              }
            }
            if (profilePicture) break;
            card = card.parentElement;
          }
        }

        // Fallback: largest on page
        if (!profilePicture) {
          warnings.push("No profile image near nameEl, scanning entire page");
          const allImgs = document.querySelectorAll("img[src*='profile-displayphoto']");
          let bestSrc = "";
          let bestArea = 0;
          for (const img of allImgs) {
            const el = img as HTMLImageElement;
            if (el.src && !el.src.includes("emoji")) {
              const area = (el.naturalWidth || 0) * (el.naturalHeight || 0);
              if (area > bestArea && area > 10000) { bestArea = area; bestSrc = el.src; }
            }
          }
          if (bestSrc) profilePicture = bestSrc;
        }

        // Post-process: upgrade resolution
        if (profilePicture) {
          profilePicture = profilePicture
            .replace(/shrink_\d+_\d+/, "scale_400_400")
            .replace(/scale_\d+_\d+/, "scale_400_400");
        }

        if (!profilePicture) warnings.push("No profile picture found");
        return { data: { profilePicture }, warnings, errors: [] };
      });
      Object.assign(data, r.data);
      allWarnings.push(...r.warnings);
      allErrors.push(...r.errors);
    }

    // ================================================================
    // Extractor 4: ExperienceExtractor
    // ================================================================
    {
      const r = safeRun("ExperienceExtractor", () => {
        const warnings: string[] = [];
        let designation = "";
        let companyName = "";

        // Primary: Experience section
        const allH2s = document.querySelectorAll("h2");
        for (const h2 of allH2s) {
          if (clean(h2.textContent) === "Experience") {
            const section = h2.parentElement?.parentElement ?? null;
            if (section) {
              const divs = section.querySelectorAll("div");
              for (const item of divs) {
                const ps = item.querySelectorAll("p");
                if (ps.length >= 2) {
                  const p1 = clean(ps[0].textContent);
                  const p2 = clean(ps[1].textContent);
                  if (p1.length > 1 && p1.length < 100 && !p1.includes("\u00B7")) designation = p1;
                  if (p2.length > 1 && p2.length < 100) {
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

        // Fallback for designation
        if (!designation && nameEl) {
          warnings.push("Experience section not found, using headline area fallback");
          let container = nameEl.parentElement;
          for (let depth = 0; depth < 5 && container; depth++) {
            const ps = container.querySelectorAll(":scope > p");
            for (const p of ps) {
              const t = clean(p.textContent);
              if (t.length > 5 && t.length < 150 &&
                  !t.includes("followers") && !t.includes("connections") &&
                  !/^·?\s*(1st|2nd|3rd|[4-9]th)\s*$/i.test(t) && !t.includes(", ")) {
                designation = t;
                break;
              }
            }
            if (designation) break;
            container = container.parentElement;
          }
        }

        if (!designation && !companyName) warnings.push("No experience data found");
        return { data: { designation, companyName }, warnings, errors: [] };
      });
      Object.assign(data, r.data);
      allWarnings.push(...r.warnings);
      allErrors.push(...r.errors);
    }

    // ================================================================
    // Extractor 5: EducationExtractor
    // ================================================================
    {
      const r = safeRun("EducationExtractor", () => {
        const warnings: string[] = [];
        let educationInstitute = "";
        let degree = "";
        let educationTimeline = "";

        // Primary: Education section
        const allH2s = document.querySelectorAll("h2");
        for (const h2 of allH2s) {
          if (clean(h2.textContent) === "Education") {
            const section = h2.parentElement?.parentElement ?? null;
            if (section) {
              const divs = section.querySelectorAll("div");
              for (const item of divs) {
                const ps = item.querySelectorAll("p");
                if (ps.length >= 2) {
                  const p1 = clean(ps[0].textContent);
                  const p2 = clean(ps[1].textContent);
                  const p3 = ps.length >= 3 ? clean(ps[2].textContent) : "";
                  if (p1.length > 3 && p1.length < 120) educationInstitute = p1;
                  if (p2.length > 1 && p2.length < 100 && !p2.match(/^\d{4}/)) degree = p2;
                  if (p3 && /\d{4}/.test(p3)) educationTimeline = p3;
                  if (educationInstitute || degree) break;
                }
              }
            }
            break;
          }
        }

        // Fallback: structured data
        if (!educationInstitute) {
          warnings.push("Education section not found, trying fallback selectors");
          const alumniEl = document.querySelector("[itemprop='alumniOf']");
          if (alumniEl) educationInstitute = clean(alumniEl.textContent);
        }

        if (!educationInstitute && !degree) warnings.push("No education data found");
        return { data: { educationInstitute, degree, educationTimeline }, warnings, errors: [] };
      });
      Object.assign(data, r.data);
      allWarnings.push(...r.warnings);
      allErrors.push(...r.errors);
    }

    // ================================================================
    // Extractor 6: LocationExtractor
    // ================================================================
    {
      const r = safeRun("LocationExtractor", () => {
        const warnings: string[] = [];
        let location = "";

        // Primary: walk up from nameEl
        if (nameEl) {
          let container = nameEl.parentElement;
          for (let depth = 0; depth < 5 && container; depth++) {
            const ps = container.querySelectorAll(":scope > p");
            for (const p of ps) {
              const t = clean(p.textContent);
              if (t.length > 3 && t.length < 60 &&
                  (t.includes(", ") || /city|country|region|division/i.test(t)) &&
                  !t.includes("followers") && !t.includes("connections") &&
                  !/^·?\s*(1st|2nd|3rd|[4-9]th)\s*$/i.test(t)) {
                location = t;
                break;
              }
            }
            if (location) break;
            container = container.parentElement;
          }
        }

        // Fallback: classic selectors
        if (!location) {
          warnings.push("Location not found near nameEl, trying classic selectors");
          const el = document.querySelector(
            ".text-body-small.inline, [itemprop='address'], .profile-info-subheader > span"
          );
          if (el) location = clean(el.textContent);
        }

        if (!location) warnings.push("No location found");
        return { data: { location }, warnings, errors: [] };
      });
      Object.assign(data, r.data);
      allWarnings.push(...r.warnings);
      allErrors.push(...r.errors);
    }

    // ================================================================
    // Extractor 7: AboutExtractor
    // ================================================================
    {
      const r = safeRun("AboutExtractor", () => {
        const warnings: string[] = [];
        let about = "";

        // Primary: classic about section
        const aboutEl = document.querySelector(".pv-about-section .pv-about__summary-text, .pv-about__summary-text");
        if (aboutEl) about = clean(aboutEl.textContent);

        // Fallback 1: #about anchor
        if (!about) {
          warnings.push("Primary about selectors not found, trying #about anchor");
          const anchor = document.querySelector("#about");
          if (anchor) {
            const section = anchor.closest("section") ?? anchor.parentElement?.parentElement;
            if (section) {
              const ps = section.querySelectorAll("p, span.text-body-small");
              for (const p of ps) {
                const t = clean(p.textContent);
                if (t.length > 20) { about = t; break; }
              }
            }
          }
        }

        // Fallback 2: "About" h2 section
        if (!about) {
          warnings.push("#about anchor not found, trying h2 section");
          const headings = document.querySelectorAll("h2, h3");
          for (const h of headings) {
            if (clean(h.textContent) === "About") {
              const section = h.parentElement?.parentElement ?? h.parentElement ?? null;
              if (section) {
                const ps = section.querySelectorAll("p, span");
                for (const p of ps) {
                  const t = clean(p.textContent);
                  if (t.length > 20) { about = t; break; }
                }
              }
              break;
            }
          }
        }

        if (!about) warnings.push("No about section found");
        return { data: { about }, warnings, errors: [] };
      });
      Object.assign(data, r.data);
      allWarnings.push(...r.warnings);
      allErrors.push(...r.errors);
    }

    // ================================================================
    // Extractor 8: SkillsExtractor
    // ================================================================
    {
      const r = safeRun("SkillsExtractor", () => {
        const warnings: string[] = [];
        const skills: string[] = [];

        // Primary: skill entity spans
        const skillEls = document.querySelectorAll(
          ".pv-skill-category-entity__name span, .pv-skill-category-entity__name-text"
        );
        for (const el of skillEls) {
          const t = clean(el.textContent);
          if (t.length > 1 && t.length < 80 && !skills.includes(t)) skills.push(t);
          if (skills.length >= 30) break;
        }

        // Fallback 1: skill topic buttons
        if (skills.length === 0) {
          warnings.push("Primary skill selectors not found, trying button fallback");
          const buttons = document.querySelectorAll(
            "button[data-field='skill_card_skill_topic'] span, button[data-field*='skill'] span"
          );
          for (const btn of buttons) {
            const t = clean(btn.textContent);
            if (t.length > 1 && t.length < 80 && !skills.includes(t)) skills.push(t);
            if (skills.length >= 30) break;
          }
        }

        // Fallback 2: Skills h2 section
        if (skills.length === 0) {
          warnings.push("Skill buttons not found, trying Skills h2 section");
          const headings = document.querySelectorAll("h2, h3");
          for (const h of headings) {
            if (clean(h.textContent) === "Skills") {
              const section = h.parentElement?.parentElement ?? h.parentElement ?? null;
              if (section) {
                const items = section.querySelectorAll("span, p");
                for (const item of items) {
                  const t = clean(item.textContent);
                  if (t.length > 1 && t.length < 80 && !skills.includes(t) && t !== "Skills") skills.push(t);
                  if (skills.length >= 30) break;
                }
              }
              break;
            }
          }
        }

        if (skills.length === 0) warnings.push("No skills found");
        return { data: { skills }, warnings, errors: [] };
      });
      Object.assign(data, r.data);
      allWarnings.push(...r.warnings);
      allErrors.push(...r.errors);
    }

    // ================================================================
    // Extractor 9: IndustryExtractor
    // ================================================================
    {
      const r = safeRun("IndustryExtractor", () => {
        const warnings: string[] = [];
        let industry = "";

        // Primary: classic selectors
        const el = document.querySelector(
          ".pv-top-card--industry, [data-field='industry'], .text-body-small [data-field*='industry']"
        );
        if (el) industry = clean(el.textContent);

        // Fallback 1: header area
        if (!industry && nameEl) {
          warnings.push("Primary industry selectors not found, trying header area");
          let container: Element | null = nameEl;
          for (let d = 0; d < 6 && container; d++) {
            const candidates = container.querySelectorAll("a[href*='/industry/'], span.text-body-small");
            for (const c of candidates) {
              const t = clean(c.textContent);
              if (t.length > 3 && t.length < 80 && !t.includes("connections") &&
                  !t.includes("followers") && !/^\d/.test(t)) {
                industry = t;
                break;
              }
            }
            if (industry) break;
            container = container.parentElement;
          }
        }

        // Fallback 2: label-based
        if (!industry) {
          warnings.push("Header area fallback failed, trying label-based search");
          const allEls = document.querySelectorAll("span, p, div");
          for (const e of allEls) {
            if (clean(e.textContent) === "Industry") {
              const next = e.nextElementSibling ?? e.parentElement?.querySelector(":scope > span:last-child");
              if (next && next !== e) {
                const val = clean(next.textContent);
                if (val.length > 2 && val.length < 80 && val !== "Industry") { industry = val; break; }
              }
            }
          }
        }

        if (!industry) warnings.push("No industry found");
        return { data: { industry }, warnings, errors: [] };
      });
      Object.assign(data, r.data);
      allWarnings.push(...r.warnings);
      allErrors.push(...r.errors);
    }

    // ================================================================
    // Extractor 10: ConnectionExtractor
    // ================================================================
    {
      const r = safeRun("ConnectionExtractor", () => {
        const warnings: string[] = [];
        let connectionDegree = "";

        // Primary: classic distance badge
        const badgeEl = document.querySelector(
          ".pv-top-card--list .distance-badge .visually-hidden, .distance-badge .visually-hidden"
        );
        if (badgeEl) connectionDegree = (badgeEl.textContent ?? "").trim();

        // Fallback 1: walk up from nameEl
        if (!connectionDegree && nameEl) {
          warnings.push("Distance badge not found, walking up from nameEl");
          let container: Element | null = nameEl;
          for (let d = 0; d < 6 && container; d++) {
            const candidates = container.querySelectorAll("span, button");
            for (const cand of candidates) {
              const t = (cand.textContent ?? "").trim();
              const match = t.match(/^(?:·\s*)?(1st|2nd|3rd|[4-9]th)$/i);
              if (match) { connectionDegree = match[1]; break; }
            }
            if (connectionDegree) break;
            container = container.parentElement;
          }
        }

        // Fallback 2: aria-label
        if (!connectionDegree) {
          warnings.push("nameEl walk-up failed, trying aria-label search");
          const ariaEls = document.querySelectorAll("[aria-label*='degree'], [aria-label*='connection']");
          for (const e of ariaEls) {
            const label = e.getAttribute("aria-label") ?? "";
            const match = label.match(/(1st|2nd|3rd|[4-9]th)/i);
            if (match) { connectionDegree = match[1]; break; }
          }
        }

        if (!connectionDegree) warnings.push("No connection degree found");
        return { data: { connectionDegree }, warnings, errors: [] };
      });
      Object.assign(data, r.data);
      allWarnings.push(...r.warnings);
      allErrors.push(...r.errors);
    }

    // ================================================================
    // Normalize into flat ProfileScrapeResult
    // ================================================================
    return {
      name: (data.name as string) ?? "",
      designation: (data.designation as string) ?? (data.headline as string) ?? "",
      companyName: (data.companyName as string) ?? "",
      profileLink: (data.profileLink as string) ?? "",
      location: (data.location as string) ?? "",
      educationInstitute: (data.educationInstitute as string) ?? "",
      degree: (data.degree as string) ?? "",
      educationTimeline: (data.educationTimeline as string) ?? "",
      profilePicture: (data.profilePicture as string) ?? "",
      connectionDegree: (data.connectionDegree as string) ?? "",
      about: (data.about as string) ?? "",
      skills: (data.skills as string[]) ?? [],
      industry: (data.industry as string) ?? "",
      warnings: allWarnings,
      errors: allErrors,
      timing: performance.now() - totalStart,
    };
  };
}
