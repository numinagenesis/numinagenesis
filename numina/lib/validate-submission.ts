import { supabase } from "@/lib/supabase";
import { getConfig } from "@/lib/config-cache";
import { parseTweetUrl } from "@/lib/parse-tweet-url";
import { fetchTweet, type TweetData } from "@/lib/fxtwitter";
import { isThreadStarter } from "@/lib/detect-thread";
import { normalizeTweetText, hashTweetText, normalizedDistance } from "@/lib/tweet-text";

const IS_DEV = process.env.NODE_ENV !== "production";

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

export type SybilRules = {
  requireXBinding: boolean;
  maxXAccountSubmissionsPerDay: number;
  minTweetSimilarityDistance: number;
  minAccountFollowingCount: number;
  minAccountTotalTweets: number;
  blockDefaultProfileImages: boolean;
};

// Safe defaults used when the sybil_rules config key hasn't been seeded yet.
// requireXBinding: false so existing users aren't locked out before migration runs.
const SYBIL_DEFAULTS: SybilRules = {
  requireXBinding: false,
  maxXAccountSubmissionsPerDay: 3,
  minTweetSimilarityDistance: 0.7,
  minAccountFollowingCount: 0,
  minAccountTotalTweets: 0,
  blockDefaultProfileImages: false,
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
    | "no_mention"
    | "self_mention_no_credit"
    // sybil codes
    | "x_binding_required"
    | "wrong_x_account"
    | "x_account_rate_limit"
    | "account_low_following"
    | "account_too_quiet"
    | "no_profile_image"
    | "duplicate_content";
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
  tweetTextHash: string;
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

  const { tweetId } = parsed;
  let canonicalUrl = parsed.canonicalUrl;

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
    // Find the oldest submission in the rolling 24h window so we can tell
    // the user exactly when their next slot opens.
    const { data: oldestRecent } = await supabase
      .from("submissions")
      .select("created_at")
      .eq("wallet_address", walletAddress.toLowerCase())
      .gte("created_at", oneDayAgo)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let message = `Daily limit reached (${rules.maxSubmissionsPerDay} per day)`;
    if (oldestRecent?.created_at) {
      const unblockedAt =
        new Date(oldestRecent.created_at).getTime() + 24 * 60 * 60 * 1000;
      const hoursUntil = Math.ceil((unblockedAt - Date.now()) / (1000 * 60 * 60));
      message = `Daily limit reached. Next slot opens in ~${hoursUntil}h`;
    }

    return { ok: false, code: "rate_limit", message };
  }

  // ── Step 4: Wallet status — ban check + binding info ─────────────────────
  // Extend select to also fetch binding data used in steps 6.5/6.6.

  const { data: wallet } = await supabase
    .from("wallets")
    .select("banned, bound_x_id, bound_x_handle")
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

  // Resolve the definitive tweet author from fxtwitter data
  const tweetAuthor = tweet.author.screen_name || parsed.author || "";
  if (tweetAuthor) {
    canonicalUrl = `https://x.com/${tweetAuthor}/status/${tweetId}`;
  }

  // Re-check canonical URL uniqueness if mobile /i/ URL resolved to real author
  if (tweetAuthor && parsed.author === null) {
    const { data: existingCanon } = await supabase
      .from("submissions")
      .select("id")
      .eq("tweet_url", canonicalUrl)
      .limit(1);
    if (existingCanon && existingCanon.length > 0) {
      return { ok: false, code: "duplicate", message: "Already submitted" };
    }
  }

  // ── Step 6: Core rule validation ─────────────────────────────────────────

  const accountAgeDays = daysBetween(tweet.author.account_created_at, now);
  if (accountAgeDays < rules.minAccountAgeDays) {
    return {
      ok: false,
      code: "account_too_new",
      message: `Account must be at least ${rules.minAccountAgeDays} days old`,
    };
  }

  if (tweet.author.followers < rules.minFollowers) {
    return {
      ok: false,
      code: "low_followers",
      message: `Account must have at least ${rules.minFollowers} followers`,
    };
  }

  const tweetAgeDays = daysBetween(tweet.created_at, now);
  if (tweetAgeDays > rules.maxTweetAgeDays) {
    return {
      ok: false,
      code: "tweet_too_old",
      message: `Tweet must be from the last ${rules.maxTweetAgeDays} days`,
    };
  }

  if (tweet.text.length < rules.minCharacters) {
    return {
      ok: false,
      code: "too_short",
      message: `Tweet must be at least ${rules.minCharacters} characters`,
    };
  }

  // ── Load sybil rules (safe defaults if config key not yet seeded) ─────────

  let sybilRules: SybilRules;
  try {
    sybilRules = await getConfig<SybilRules>("sybil_rules");
  } catch {
    sybilRules = { ...SYBIL_DEFAULTS };
  }

  // ── Step 6.5: X binding required ─────────────────────────────────────────

  if (sybilRules.requireXBinding) {
    const boundXId = (wallet as { bound_x_id?: string | null } | null)?.bound_x_id ?? null;
    if (!boundXId) {
      return {
        ok: false,
        code: "x_binding_required",
        message: "Bind your X account first to submit tweets",
      };
    }
  }

  // ── Step 6.6: Tweet author must match bound X account ────────────────────

  const boundXId = (wallet as { bound_x_id?: string | null } | null)?.bound_x_id ?? null;
  const boundXHandle = (wallet as { bound_x_handle?: string | null } | null)?.bound_x_handle ?? null;

  if (boundXId) {
    const tweetAuthorId = tweet.author.id;
    if (!tweetAuthorId || tweetAuthorId !== boundXId) {
      return {
        ok: false,
        code: "wrong_x_account",
        message: boundXHandle
          ? `Tweet must come from your bound X account @${boundXHandle}`
          : "Tweet must come from your bound X account",
      };
    }
  }

  // ── Step 6.7: X account daily rate limit ─────────────────────────────────

  if (boundXId && sybilRules.maxXAccountSubmissionsPerDay > 0) {
    const { count: xTodayCount } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("x_account_id", boundXId)
      .gte("created_at", oneDayAgo);

    if ((xTodayCount ?? 0) >= sybilRules.maxXAccountSubmissionsPerDay) {
      return {
        ok: false,
        code: "x_account_rate_limit",
        message: `Daily limit reached for this X account (${sybilRules.maxXAccountSubmissionsPerDay} per day)`,
      };
    }
  }

  // ── Step 6.8: Account quality checks ─────────────────────────────────────

  if (sybilRules.minAccountFollowingCount > 0 &&
      tweet.author.following < sybilRules.minAccountFollowingCount) {
    return {
      ok: false,
      code: "account_low_following",
      message: `X account must follow at least ${sybilRules.minAccountFollowingCount} accounts`,
    };
  }

  if (sybilRules.minAccountTotalTweets > 0 &&
      tweet.author.statuses_count < sybilRules.minAccountTotalTweets) {
    return {
      ok: false,
      code: "account_too_quiet",
      message: `X account must have at least ${sybilRules.minAccountTotalTweets} tweets`,
    };
  }

  if (sybilRules.blockDefaultProfileImages) {
    const avatar = tweet.author.avatar_url;
    const isDefault =
      !avatar ||
      avatar.includes("default_profile") ||
      avatar.includes("default_profile_images");
    if (isDefault) {
      return {
        ok: false,
        code: "no_profile_image",
        message: "X account must have a custom profile image",
      };
    }
  }

  // ── Step 6.9: Tweet content similarity ───────────────────────────────────

  const normalizedText = normalizeTweetText(tweet.text);
  const tweetTextHash = hashTweetText(tweet.text);

  if (normalizedText.length > 0) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentSubs } = await supabase
      .from("submissions")
      .select("tweet_text_hash, raw_data")
      .eq("wallet_address", walletAddress.toLowerCase())
      .gte("created_at", thirtyDaysAgo)
      .limit(50);

    for (const sub of recentSubs ?? []) {
      // Fast path: exact hash match → identical content
      if (sub.tweet_text_hash && sub.tweet_text_hash === tweetTextHash) {
        return {
          ok: false,
          code: "duplicate_content",
          message: "Tweet is too similar to a previous submission",
        };
      }

      // Slow path: Levenshtein similarity check
      const priorText = normalizeTweetText(
        (sub.raw_data as { text?: string } | null)?.text ?? ""
      );
      if (priorText.length > 0) {
        const dist = normalizedDistance(normalizedText, priorText);
        if (dist < sybilRules.minTweetSimilarityDistance) {
          return {
            ok: false,
            code: "duplicate_content",
            message: "Tweet is too similar to a previous submission",
          };
        }
      }
    }
  }

  // ── Step 7: Mention check ─────────────────────────────────────────────────

  const xHandle = await getConfig<XHandle>("x_handle");
  const requiredHandle = xHandle.handle.toLowerCase().trim();

  // Self-mention guard
  const posterHandle = tweet.author.screen_name.toLowerCase().trim();
  if (posterHandle === requiredHandle) {
    return {
      ok: false,
      code: "self_mention_no_credit",
      message: `Posting from @${xHandle.handle} doesn't count. Mention @${xHandle.handle} from another account.`,
    };
  }

  const mentionedHandles = tweet.mentioned_handles.map((h) => h.toLowerCase().trim());

  if (IS_DEV) {
    console.log("[validate] mention check:");
    console.log("  expected handle :", requiredHandle);
    console.log("  tweet text      :", tweet.text);
    console.log("  mentioned_handles:", mentionedHandles);
    console.log("  includes match  :", mentionedHandles.includes(requiredHandle));
  }

  if (!mentionedHandles.includes(requiredHandle)) {
    return {
      ok: false,
      code: "no_mention",
      message: `Tweet must mention @${xHandle.handle}`,
    };
  }

  // ── Step 8: Calculate points ─────────────────────────────────────────────

  const earnRates = await getConfig<EarnRates>("earn_rates");

  let points = earnRates.basicTweet;
  if (tweet.has_media) points = Math.max(points, earnRates.tweetWithMedia);
  if (tweet.is_quote)  points = Math.max(points, earnRates.quoteTweet);
  if (tweet.is_reply)  points = Math.max(points, earnRates.reply);

  const thread = await isThreadStarter(tweet);
  if (thread) points = Math.max(points, earnRates.thread3Plus);

  // likeBonus100 / likeBonus1000 skipped for v1 per spec

  // ── Step 9: Return success ────────────────────────────────────────────────

  return {
    ok: true,
    points,
    tweetData: tweet,
    canonicalUrl,
    tweetId,
    tweetAuthor,
    validatedHandle: xHandle.handle,
    tweetTextHash,
  };
}
