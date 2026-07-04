/**
 * Shared DOM utility functions used by all extractors.
 * These are pure functions with no side effects -- safe to inline
 * into the orchestrator's self-contained closure.
 */

/** Trim and collapse internal whitespace. */
export function cleanText(text: string | null | undefined): string {
  if (!text) return "";
  return text.trim().replace(/\s+/g, " ");
}

/**
 * Try each CSS selector in order against `root`.
 * Returns the first Element that matches, or null.
 */
export function trySelector(root: ParentNode, ...selectors: string[]): Element | null {
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}

/**
 * Try each CSS selector and return the text content of the first match.
 */
export function getText(root: ParentNode, ...selectors: string[]): string {
  const el = trySelector(root, ...selectors);
  return cleanText(el?.textContent);
}

/**
 * Find a section container by looking for an h2 (or h3) whose text matches `headingText`.
 * Returns the section's grandparent (the typical section wrapper), or null.
 */
export function findSection(root: ParentNode, headingText: string): Element | null {
  const headings = root.querySelectorAll("h2, h3");
  for (const h of headings) {
    if (cleanText(h.textContent) === headingText) {
      return h.parentElement?.parentElement ?? h.parentElement ?? null;
    }
  }
  return null;
}

/**
 * Walk up the DOM from `el` up to `maxDepth` levels.
 * Returns the first ancestor that satisfies `predicate`, or null.
 */
export function walkUp(
  el: Element | null,
  maxDepth: number,
  predicate: (el: Element) => boolean
): Element | null {
  let current = el;
  for (let i = 0; i < maxDepth && current; i++) {
    if (predicate(current)) return current;
    current = current.parentElement;
  }
  return null;
}

/**
 * Walk up from `el` and return the first descendant matching `selector`
 * at each level. Useful for finding related content near an anchor element.
 */
export function walkUpForText(
  el: Element | null,
  maxDepth: number,
  selector: string,
  filter: (text: string) => boolean
): string {
  let current = el?.parentElement ?? null;
  for (let i = 0; i < maxDepth && current; i++) {
    const candidates = current.querySelectorAll(selector);
    for (const c of candidates) {
      const t = cleanText(c.textContent);
      if (t && filter(t)) return t;
    }
    current = current.parentElement;
  }
  return "";
}

/**
 * Query all elements matching `selector` within `root`, extract text,
 * filter, and return up to `limit` results.
 */
export function collectTexts(
  root: ParentNode,
  selector: string,
  filter: (text: string) => boolean = (t) => t.length > 0,
  limit = 50
): string[] {
  const els = root.querySelectorAll(selector);
  const results: string[] = [];
  for (const el of els) {
    if (results.length >= limit) break;
    const t = cleanText(el.textContent);
    if (filter(t)) results.push(t);
  }
  return results;
}
