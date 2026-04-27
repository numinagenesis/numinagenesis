import { supabase } from "@/lib/supabase";
import { getConfig } from "@/lib/config-cache";
import { parseTweetUrl } from "@/lib/parse-tweet-url";
import { fetchTweet, type TweetData } from "@/lib/fxtwitter";
import { isThreadStarter } from "@/lib/detect-thread";

// ── Config types (mirrored from admin/cards.tsx — kept in sync manually) ────

type Rules = {
  minAccountAgeDays: number;
  minFollowers: number;
  minCharacters: number;
  maxTweetAgeDays: number;
  maxSubmissionsPerDay: number;
};

type XHandle = {
  handle: string;
  mention: string;
};

type EarnRates = {
  basicTweet: number;
  tweetWithMedia: number;
  thread3Plus: number;
  quoteTweet: number;
  reply: number;
  likeBonus100: number;
  likeBonus1000: number;
};

// ── Result types ─────────────────────────────────────────────────────────────

export type ValidationError = {
  ok: false;
  code:
    | "invalid_url"
    | "duplicate"
    | "rate_limit"
    | "banned"
    | "fetch_failed"
    | "account_too_new"
    | "low_followers"
    | "tweet_too_old"
    | "too_short"
    | "no_mention";
  message: string;
};

export type ValidationSuccess = {
  ok: true;
  points: number;
  tweetData: TweetData;
  canonicalUrl: string;
  tweetId: string;
  tweetAuthor: string;
  validatedHandle: string;
};

export type ValidationResult = ValidationError | ValidationSuccess;

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(isoA: string, isoB: string): number {
  const msA = new Date(isoA).getTime();
  const msB = new Date(isoB).getTime();
  return Math.abs(msB - msA) / (1000 * 60 * 60 * 24);
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export async function validateSubmission({
  tweetUrl,
  walletAddress,
}: {
  tweetUrl: string;
  walletAddress: string;
}): Promise<ValidationResult> {
  const now = new Date().toISOString();

  // ── Step 1: Parse URL ────────────────────────────────────────────────────

  const parsed = parseTweetUrl(tweetUrl);
  if (!parsed.ok) {
    return { ok: false, code: "invalid_url", message: parsed.error };
  }

  const { tweetId, canonicalUrl, author: tweetAuthor } = parsed;

  // ── Step 2: Uniqueness — tweet_id or canonical URL already submitted ─────

  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .or(`tweet_id.eq.${tweetId},tweet_url.eq.${canonicalUrl}`)
    .limit(1);

  if (existing && existing.length > 0) {
    return { ok: false, code: "duplicate", message: "Already submitted" };
  }

  // ── Step 3: Wallet rate limit ────────────────────────────────────────────

  const rules = await getConfig<Rules>("rules");

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: todayCount } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("wallet_address", walletAddress.toLowerCase())
    .gte("created_at", oneDayAgo);

  if ((todayCount ?? 0) >= rules.maxSubmissionsPerDay) {
    return {
      ok: false,
      code: "rate_limit",
      message: `Daily submission limit reached (${rules.maxSubmissionsPerDay} per day)`,
    };
  }

  // ── Step 4: Wallet not banned ────────────────────────────────────────────

  const { data: wallet } = await supabase
    .from("wallets")
    .select("banned")
    .eq("address", walletAddress.toLowerCase())
    .maybeSingle();

  if (wallet?.banned) {
    return { ok: false, code: "banned", message: "This wallet has been banned" };
  }

  // ── Step 5: Fetch tweet ──────────────────────────────────────────────────

  const fetched = await fetchTweet(tweetId);
  if (!fetched.ok) {
    const msg =
      fetched.error === "not_found"
        ? "Tweet not found (it may be deleted or private)"
        : fetched.error === "timeout"
        ? "Tweet lookup timed out — please try again"
        : "Could not load tweet — please try again";
    return { ok: false, code: "fetch_failed", message: msg };
  }

  const tweet = fetched.data;

  // ── Step 6: Rule validation ──────────────────────────────────────────────

  // Account age
  const accountAgeDays = daysBetween(tweet.author.account_created_at, now);
  if (accountAgeDays < rules.minAccountAgeDays) {
    return {
      ok: false,
      code: "account_too_new",
      message: `Account must be at least ${rules.minAccountAgeDays} days old`,
    };
  }

  // Follower count
  if (tweet.author.followers < rules.minFollowers) {
    return {
      ok: false,
      code: "low_followers",
      message: `Account must have at least ${rules.minFollowers} followers`,
    };
  }

  // Tweet age
  const tweetAgeDays = daysBetween(tweet.created_at, now);
  if (tweetAgeDays > rules.maxTweetAgeDays) {
    return {
      ok: false,
      code: "tweet_too_old",
      message: `Tweet must be from the last ${rules.maxTweetAgeDays} days`,
    };
  }

  // Character count
  if (tweet.text.length < rules.minCharacters) {
    return {
      ok: false,
      code: "too_short",
      message: `Tweet must be at least ${rules.minCharacters} characters`,
    };
  }

  // Mention check
  const xHandle = await getConfig<XHandle>("x_handle");
  const requiredHandle = xHandle.handle.toLowerCase();
  if (!tweet.mentioned_handles.includes(requiredHandle)) {
    return {
      ok: false,
      code: "no_mention",
      message: `Tweet must mention @${xHandle.handle}`,
    };
  }

  // ── Step 7: Calculate points ─────────────────────────────────────────────

  const earnRates = await getConfig<EarnRates>("earn_rates");

  let points = earnRates.basicTweet;

  if (tweet.has_media) {
    points = Math.max(points, earnRates.tweetWithMedia);
  }
  if (tweet.is_quote) {
    points = Math.max(points, earnRates.quoteTweet);
  }
  if (tweet.is_reply) {
    points = Math.max(points, earnRates.reply);
  }

  const thread = await isThreadStarter(tweet);
  if (thread) {
    points = Math.max(points, earnRates.thread3Plus);
  }

  // likeBonus100 / likeBonus1000 skipped for v1 per spec

  // ── Step 8: Return success ───────────────────────────────────────────────

  return {
    ok: true,
    points,
    tweetData: tweet,
    canonicalUrl,
    tweetId,
    tweetAuthor,
    validatedHandle: xHandle.handle,
  };
}
