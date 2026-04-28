import { createHash } from "crypto";

// ── Text normalization ────────────────────────────────────────────────────────

/**
 * Strips URLs, @mentions, and collapses whitespace so two tweets with
 * only superficial differences produce similar normalized strings.
 */
export function normalizeTweetText(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")   // strip URLs
    .replace(/@\w{1,15}/g, "")         // strip @mentions
    .replace(/\s+/g, " ")              // collapse whitespace
    .trim();
}

/**
 * SHA-1 hex digest of the normalized tweet text.
 * Used for fast exact-duplicate detection on insert.
 */
export function hashTweetText(text: string): string {
  return createHash("sha1")
    .update(normalizeTweetText(text))
    .digest("hex");
}

// ── Levenshtein distance ──────────────────────────────────────────────────────

/**
 * Classic Wagner-Fischer DP Levenshtein distance.
 * O(m·n) time, O(n) space via two-row approach.
 * Fast enough for tweet-length strings (≤ 280 chars stripped).
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // prev = previous row, curr = current row
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  const curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    // swap rows without allocating
    const tmp = prev;
    prev = curr.slice();
    void tmp; // suppress unused-var lint
  }
  return prev[n];
}

/**
 * Returns a normalized distance in [0, 1].
 *   0 = identical strings
 *   1 = maximally different
 *
 * normalizedDistance < threshold  → too similar → reject submission
 * normalizedDistance >= threshold → sufficiently different → allow
 */
export function normalizedDistance(a: string, b: string): number {
  if (a === b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  return levenshteinDistance(a, b) / maxLen;
}
