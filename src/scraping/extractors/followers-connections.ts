import type { ExtractorFn, ScraperContext, ExtractorResult } from "../extractor-types";

interface FollowerConnectionData {
  followers: string;
  connections: string;
}

/**
 * FollowersConnectionsExtractor -- extracts follower count and connection count.
 *
 * Handles:
 * - "500+ followers" / "1,234 followers"
 * - "500+ connections"
 * - Text near the profile header area
 * - Missing values never fail; returns empty strings
 */
export const extractFollowersConnections: ExtractorFn<FollowerConnectionData> = (
  ctx: ScraperContext
): ExtractorResult<FollowerConnectionData> => {
  const start = performance.now();
  const warnings: string[] = [];

  function clean(text: string | null | undefined): string {
    return (text ?? "").trim().replace(/\s+/g, " ");
  }

  let followers = "";
  let connections = "";

  const FOLLOWER_REGEX = /([\d,]+)\+?\s*followers?/i;
  const CONNECTION_REGEX = /([\d,]+)\+?\s*connections?/i;

  // Primary: scan text elements near the top of the profile
  const headerArea =
    ctx.root.querySelector("main") ?? ctx.root;

  const candidates = headerArea.querySelectorAll(
    "span, p, a, div"
  );

  for (const el of candidates) {
    const t = clean(el.textContent);
    if (!t || t.length > 80) continue;

    if (!followers) {
      const m = t.match(FOLLOWER_REGEX);
      if (m) {
        followers = m[0];
      }
    }

    if (!connections) {
      const m = t.match(CONNECTION_REGEX);
      if (m) {
        connections = m[0];
      }
    }

    if (followers && connections) break;
  }

  if (!followers) warnings.push("No followers count found");
  if (!connections) warnings.push("No connections count found");

  return {
    success: !!(followers || connections),
    data: { followers, connections },
    warnings,
    errors: [],
    timing: performance.now() - start,
  };
};
