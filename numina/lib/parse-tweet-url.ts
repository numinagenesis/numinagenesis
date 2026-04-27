export type ParseResult =
  | { ok: true; author: string; tweetId: string; canonicalUrl: string }
  | { ok: false; error: string };

// Matches /status/{numeric_id} in the pathname
const STATUS_RE = /^\/(\w+)\/status\/(\d+)\/?$/;

const VALID_HOSTS = new Set([
  "twitter.com",
  "x.com",
  "mobile.twitter.com",
  "www.twitter.com",
  "www.x.com",
]);

/**
 * Parses a tweet URL into its canonical form.
 *
 * Accepted patterns:
 *   https://twitter.com/{author}/status/{id}
 *   https://x.com/{author}/status/{id}
 *   https://www.twitter.com/{author}/status/{id}
 *   https://www.x.com/{author}/status/{id}
 *   https://mobile.twitter.com/{author}/status/{id}
 *   Optional query strings, fragments, and trailing slashes are stripped.
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
  const match = STATUS_RE.exec(pathname);

  if (!match) {
    return {
      ok: false,
      error: "Not a valid tweet URL — must be a /status/ link",
    };
  }

  const author = match[1];
  const tweetId = match[2];

  // Canonical form always uses x.com, no query params
  const canonicalUrl = `https://x.com/${author}/status/${tweetId}`;

  return { ok: true, author, tweetId, canonicalUrl };
}
