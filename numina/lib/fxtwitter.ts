const FXTWITTER_BASE = "https://api.fxtwitter.com";
const TIMEOUT_MS = 10_000;
const IS_DEV = process.env.NODE_ENV !== "production";

// ── Normalized tweet shape ────────────────────────────────────────────────────

export type TweetData = {
  id: string;
  text: string;
  author: {
    screen_name: string;
    followers: number;
    account_created_at: string; // ISO date string
  };
  created_at: string; // ISO date string
  has_media: boolean;
  is_quote: boolean;
  is_reply: boolean;
  parent_id: string | null;
  mentioned_handles: string[]; // lowercase, no @
  /** Number of continuation tweets in the thread (populated if fxtwitter returns thread data). */
  _thread_continuation_count: number;
};

// ── Result type ───────────────────────────────────────────────────────────────

export type FetchTweetResult =
  | { ok: true; data: TweetData }
  | { ok: false; error: "not_found" | "timeout" | "unavailable" };

// ── fxtwitter raw shapes (partial — only what we need) ────────────────────────

type FxAuthor = {
  screen_name?: string;
  followers?: number;
  /** ISO date or Twitter's "Mon Jan 01 00:00:00 +0000 2020" format */
  joined?: string;
  created_at?: string;
};

type FxMedia = {
  photos?: unknown[];
  videos?: unknown[];
};

type FxUserMention = {
  screen_name?: string;
  name?: string;
};

type FxEntities = {
  user_mentions?: FxUserMention[];
};

type FxThreadTweet = {
  author?: { screen_name?: string };
};

type FxThread = {
  tweets?: FxThreadTweet[];
};

type FxTweet = {
  id?: string;
  text?: string;
  author?: FxAuthor;
  created_at?: string;
  media?: FxMedia;
  quote?: unknown;
  replying_to?: string;
  replying_to_status?: string;
  /** Structured user mentions — primary source */
  entities?: FxEntities;
  /** Alternate mentions field used by some fxtwitter response variants */
  mentions?: FxUserMention[];
  thread?: FxThread;
};

type FxResponse = {
  code?: number;
  message?: string;
  tweet?: FxTweet;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * fxtwitter may return account creation date in Twitter's legacy string format:
 * "Mon Jan 01 00:00:00 +0000 2020"
 * or as an ISO string. Normalize to ISO.
 */
function normalizeDate(raw: string | undefined): string {
  if (!raw) return new Date(0).toISOString();

  // Already ISO-ish (starts with 4-digit year or contains 'T')
  if (/^\d{4}-/.test(raw) || raw.includes("T")) {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
  }

  // Twitter legacy format: "Mon Jan 01 00:00:00 +0000 2020"
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

/**
 * Extracts all mentioned handles from a tweet using three sources, merged
 * into a deduplicated, lowercase array with no @ prefix.
 *
 * Sources (in priority order, all merged):
 *   1. tweet.entities.user_mentions[].screen_name  (structured, preferred)
 *   2. tweet.mentions[].screen_name                (alternate fxtwitter field)
 *   3. /@(\w{1,15})/g regex on tweet.text          (reliable fallback)
 */
function extractMentions(tweet: FxTweet): string[] {
  const handleSet = new Set<string>();

  // Source 1: entities.user_mentions
  (tweet.entities?.user_mentions ?? []).forEach((m) => {
    const h = (m.screen_name ?? "").toLowerCase().trim();
    if (h) handleSet.add(h);
  });

  // Source 2: tweet.mentions (alternate field present in some fxtwitter versions)
  (tweet.mentions ?? []).forEach((m) => {
    const h = (m.screen_name ?? "").toLowerCase().trim();
    if (h) handleSet.add(h);
  });

  // Source 3: regex over raw tweet text — most reliable fallback
  // Twitter/X usernames: 1–15 chars, alphanumeric + underscore
  const textMentions = (tweet.text ?? "").match(/@(\w{1,15})/g) ?? [];
  textMentions.forEach((m) => {
    const h = m.slice(1).toLowerCase(); // strip @
    if (h) handleSet.add(h);
  });

  return Array.from(handleSet);
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetches a tweet from fxtwitter and normalizes it into TweetData.
 * Never throws — always returns a result object.
 */
export async function fetchTweet(tweetId: string): Promise<FetchTweetResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(
      `${FXTWITTER_BASE}/_/status/${tweetId}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (res.status === 404) return { ok: false, error: "not_found" };
    if (!res.ok) {
      console.error("[fxtwitter] HTTP", res.status, "for tweet", tweetId);
      return { ok: false, error: "unavailable" };
    }

    let json: FxResponse;
    try {
      json = await res.json();
    } catch {
      console.error("[fxtwitter] invalid JSON for tweet", tweetId);
      return { ok: false, error: "unavailable" };
    }

    // Dev: log the raw response so mention extraction can be debugged
    if (IS_DEV) {
      console.log("[fxtwitter] raw response for", tweetId, ":", JSON.stringify(json, null, 2));
    }

    const tweet = json?.tweet;

    // Treat missing or tombstoned tweets as unavailable
    if (!tweet || !tweet.id || !tweet.text) {
      if (IS_DEV) {
        console.log("[fxtwitter] tweet unavailable — missing id/text. code:", json?.code, "message:", json?.message);
      }
      return { ok: false, error: "unavailable" };
    }

    const author = tweet.author ?? {};
    const accountCreatedAt = normalizeDate(author.joined ?? author.created_at);
    const tweetCreatedAt = normalizeDate(tweet.created_at);

    // Extract mentions from all available sources
    const mentionedHandles = extractMentions(tweet);

    if (IS_DEV) {
      console.log("[fxtwitter] tweet", tweetId, "— author:", author.screen_name,
        "| text:", tweet.text,
        "| entities.user_mentions:", tweet.entities?.user_mentions,
        "| tweet.mentions:", tweet.mentions,
        "| resolved mentioned_handles:", mentionedHandles);
    }

    // Thread continuation count:
    // fxtwitter includes thread.tweets for self-reply threads.
    // Each entry is a subsequent tweet from the same author.
    const threadTweets = tweet.thread?.tweets ?? [];
    const authorHandle = (author.screen_name ?? "").toLowerCase();
    const continuationCount = threadTweets.filter((t) => {
      const tAuthor = (t?.author?.screen_name ?? "").toLowerCase();
      return tAuthor === authorHandle || tAuthor === "";
    }).length;

    const data: TweetData = {
      id: String(tweet.id),
      text: tweet.text,
      author: {
        screen_name: author.screen_name ?? "",
        followers: author.followers ?? 0,
        account_created_at: accountCreatedAt,
      },
      created_at: tweetCreatedAt,
      has_media:
        (tweet.media?.photos?.length ?? 0) > 0 ||
        (tweet.media?.videos?.length ?? 0) > 0,
      is_quote: Boolean(tweet.quote),
      is_reply: Boolean(tweet.replying_to_status),
      parent_id: tweet.replying_to_status ?? null,
      mentioned_handles: mentionedHandles,
      _thread_continuation_count: continuationCount,
    };

    return { ok: true, data };
  } catch (err) {
    clearTimeout(timer);
    const name = (err as Error)?.name;
    if (name === "AbortError") {
      console.error("[fxtwitter] timeout fetching tweet", tweetId);
      return { ok: false, error: "timeout" };
    }
    console.error("[fxtwitter] unexpected error fetching tweet", tweetId, err);
    return { ok: false, error: "unavailable" };
  }
}
