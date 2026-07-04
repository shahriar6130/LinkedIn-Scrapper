/**
 * Intelligent page loader for LinkedIn profile pages.
 *
 * Runs in MAIN world via chrome.scripting.executeScript BEFORE the scraper.
 * Expands collapsed sections, clicks "See more" buttons, waits for DOM
 * stabilization, and uses human-like timing throughout.
 *
 * Returns a self-contained async function -- no external dependencies.
 */

export interface PageLoadResult {
  ready: boolean;
  expandedSections: string[];
  navigationChanged: boolean;
  warnings: string[];
  timing: number;
}

/**
 * Build a self-contained async page-loader function for executeScript.
 * The returned function returns a Promise<PageLoadResult>.
 */
export function buildPageLoader(): () => Promise<PageLoadResult> {
  return async function loadPage(): Promise<PageLoadResult> {
    const totalStart = performance.now();
    const warnings: string[] = [];
    const expandedSections: string[] = [];
    const startUrl = window.location.href;

    // ── Helpers ──────────────────────────────────────────────

    /** Check if SPA navigation occurred since we started. */
    function navChanged(): boolean {
      return window.location.href !== startUrl;
    }

    /** Random delay between min and max ms (human-like). */
    function humanDelay(min: number, max: number): Promise<void> {
      const ms = min + Math.random() * (max - min);
      return new Promise((r) => setTimeout(r, ms));
    }

    /** Smooth-scroll an element into view. */
    function scrollIntoView(el: Element): void {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    /**
     * Wait until the DOM stops mutating for `stableFor` ms,
     * or until `maxWait` ms have elapsed.
     */
    function waitForDomStability(
      root: Node,
      stableFor: number,
      maxWait: number
    ): Promise<"stable" | "timeout"> {
      return new Promise((resolve) => {
        let lastMutation = performance.now();
        let resolved = false;

        const observer = new MutationObserver(() => {
          lastMutation = performance.now();
        });

        observer.observe(root, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        });

        const check = () => {
          if (resolved) return;
          const elapsed = performance.now() - lastMutation;
          if (elapsed >= stableFor) {
            resolved = true;
            observer.disconnect();
            resolve("stable");
            return;
          }
          if (performance.now() - (lastMutation - elapsed) > maxWait) {
            resolved = true;
            observer.disconnect();
            resolve("timeout");
            return;
          }
          requestAnimationFrame(check);
        };

        requestAnimationFrame(check);
      });
    }

    /**
     * Find all currently-visible expand / "See more" buttons and click them.
     * Returns the labels of buttons that were clicked.
     */
    function clickExpandButtons(): string[] {
      const clicked: string[] = [];

      // Broad selector list covering LinkedIn's many expand-button variants
      const selectors = [
        // "…see more" inline buttons
        "button.inline-show-more-text",
        // Section expand buttons
        "button[aria-expanded='false']",
        // Generic "Show more" / "See more" buttons
        "button span[class*='show-more']",
        // Collapsed section expanders (experience, education, etc.)
        "section button[class*='expand']",
        "section button[class*='show-more']",
        // About section
        "#about + div button",
        ".pv-about-section button",
        // Skills endorsements expand
        "button.pv-skills__button",
        // "Show all" buttons in cards
        "button[class*='show-all']",
        // Generic aria-expanded
        "[aria-expanded='false'] > button",
        // Inline display toggle
        "button.artdeco-button--tertiary span",
      ];

      for (const sel of selectors) {
        try {
          const buttons = document.querySelectorAll(sel);
          for (const btn of buttons) {
            // Ensure the button is visible and enabled
            const el = (btn.closest("button") ?? (btn.tagName === "BUTTON" ? btn : null)) as HTMLButtonElement | null;
            if (!el) continue;
            if (el.disabled) continue;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;

            const label =
              el.getAttribute("aria-label") ??
              (el.textContent ?? "").trim().slice(0, 40);

            // Avoid clicking the same button twice
            if (clicked.includes(label)) continue;

            el.click();
            clicked.push(label || sel);
          }
        } catch {
          // Selector may be invalid on this page version -- skip silently
        }
      }

      return clicked;
    }

    /**
     * Scroll the page incrementally to trigger lazy-loaded content.
     * Scrolls from top to bottom of the main profile area.
     */
    async function scrollForLazyLoad(): Promise<void> {
      const scrollContainer =
        document.querySelector("main") ??
        document.querySelector(".scaffold-layout__main") ??
        document.documentElement;

      const totalHeight = scrollContainer.scrollHeight;
      const viewportHeight = window.innerHeight;
      const step = Math.floor(viewportHeight * 0.6);

      // Scroll down in steps
      for (let y = 0; y < totalHeight; y += step) {
        if (navChanged()) return;
        scrollContainer.scrollTop = y;
        await humanDelay(150, 350);
      }

      // Scroll back to top
      scrollContainer.scrollTop = 0;
      await humanDelay(200, 400);
    }

    // ── Main flow ────────────────────────────────────────────

    try {
      // Step 1: Scroll to trigger lazy loading
      await scrollForLazyLoad();
      if (navChanged()) {
        return {
          ready: false,
          expandedSections: [],
          navigationChanged: true,
          warnings: ["Navigation changed during lazy-load scroll"],
          timing: performance.now() - totalStart,
        };
      }

      // Step 2: Iteratively expand collapsed sections
      // Keep clicking expand buttons until no more are found (max 5 rounds)
      for (let round = 0; round < 5; round++) {
        if (navChanged()) break;

        const clicked = clickExpandButtons();
        if (clicked.length === 0) break;

        expandedSections.push(...clicked);

        // Wait for DOM to react to the clicks
        await humanDelay(400, 800);
        await waitForDomStability(document.body, 300, 3000);
      }

      if (expandedSections.length > 0) {
        warnings.push(`Expanded ${expandedSections.length} section(s): ${expandedSections.slice(0, 5).join(", ")}`);
      }

      // Step 3: Final DOM stabilization wait
      const stability = await waitForDomStability(document.body, 500, 5000);
      if (stability === "timeout") {
        warnings.push("DOM did not fully stabilize within timeout");
      }

      // Step 4: Check for navigation change
      if (navChanged()) {
        return {
          ready: false,
          expandedSections,
          navigationChanged: true,
          warnings: [...warnings, "Navigation changed during page loading"],
          timing: performance.now() - totalStart,
        };
      }

      return {
        ready: true,
        expandedSections,
        navigationChanged: false,
        warnings,
        timing: performance.now() - totalStart,
      };
    } catch (err) {
      warnings.push(
        "Page loader error: " + (err instanceof Error ? err.message : String(err))
      );
      return {
        ready: true, // Still attempt scrape even if loader had issues
        expandedSections,
        navigationChanged: navChanged(),
        warnings,
        timing: performance.now() - totalStart,
      };
    }
  };
}
