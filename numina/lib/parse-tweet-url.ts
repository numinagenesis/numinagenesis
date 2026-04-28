export type ParseResult =
  | { ok: true; author: string | null; tweetId: string; canonicalUrl: string }
  | { ok: false; error: string };

// Standard pattern: /{author}/status/{id}
// Also matches /i/status/{id} (mobile share URLs) — author will be detected as "i"
const STANDARD_RE = /^\/(\w+)\/status\/(\d+)\/?$/;

// /i/web/status/{id} — another mobile share URL variant
const I_WEB_RE = /^\/i\/web\/status\/(\d+)\/?$/;

const VALID_HOSTS = new Set([
  "twitter.com",
  "x.com",
  "mobile.twitter.com",
  "www.twitter.com",
  "www.x.com",
]);

// X reserves "/i" as an internal path prefix — not a real user handle.
// Any URL with author segment "i" is a mobile share URL with no real author embedded.
const INTERNAL_SEGMENTS = new Set(["i"]);

/**
 * Parses a tweet URL into its canonical form.
 *
 * Accepted patterns:
 *   https://twitter.com/{author}/status/{id}
 *   https://x.com/{author}/status/{id}
 *   https://www.twitter.com/{author}/status/{id}
 *   https://www.x.com/{author}/status/{id}
 *   https://mobile.twitter.com/{author}/status/{id}
 *   https://x.com/i/status/{id}          ← mobile share URL (no real author)
 *   https://x.com/i/web/status/{id}      ← alternate mobile share URL
 *   Optional query strings, fragments, and trailing slashes are stripped.
 *
 * When author cannot be determined from the URL (mobile /i/ URLs), `author` is
 * returned as null. Callers should resolve the real author from the tweet data
 * fetched via fxtwitter after parsing.
 */
export function parseTweetUrl(raw: string): ParseResult {
  const trimmed = raw.trim();

  let url: URL;
  try {
    // Handle bare URLs without a scheme
    const withScheme =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;
    url = new URL(withScheme);
  } catch {
    return { ok: false, error: "Not a valid URL" };
  }

  if (!VALID_HOSTS.has(url.hostname)) {
    return {
      ok: false,
      error: "Must be a twitter.com or x.com URL",
    };
  }

  // Strip trailing slash for consistent matching
  const pathname = url.pathname.replace(/\/$/, "");

  // Try /i/web/status/{id} first (more specific pattern)
  const iWebMatch = I_WEB_RE.exec(pathname);
  if (iWebMatch) {
    const tweetId = iWebMatch[1];
    // Author is unknown — canonical URL uses _ as placeholder
    const canonicalUrl = `https://x.com/_/status/${tweetId}`;
    return { ok: true, author: null, tweetId, canonicalUrl };
  }

  // Try standard /{author}/status/{id}
  const match = STANDARD_RE.exec(pathname);
  if (!match) {
    return {
      ok: false,
      error: "Not a valid tweet URL — must be a /status/ link",
    };
  }

  const rawAuthor = match[1];
  const tweetId = match[2];

  // If the author segment is an internal X path prefix, treat as authorless
  if (INTERNAL_SEGMENTS.has(rawAuthor.toLowerCase())) {
    const canonicalUrl = `https://x.com/_/status/${tweetId}`;
    return { ok: true, author: null, tweetId, canonicalUrl };
  }

  // Normal author-bearing URL
  const canonicalUrl = `https://x.com/${rawAuthor}/status/${tweetId}`;
  return { ok: true, author: rawAuthor, tweetId, canonicalUrl };
}
