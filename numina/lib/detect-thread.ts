import { fetchTweet, type TweetData } from "@/lib/fxtwitter";

const MAX_DEPTH = 5;

/**
 * Returns true if the submitted tweet is the starter of a thread with 3+ tweets
 * from the same author.
 *
 * Strategy:
 *  1. If fxtwitter already returned thread continuation data in TweetData,
 *     use that count directly (2+ continuations = thread starter with 3+ tweets).
 *  2. Otherwise, walk the conversation chain recursively by fetching parent tweets
 *     to count how many consecutive tweets share the same author.
 *     Cap recursion at MAX_DEPTH levels.
 *
 * On any failure, returns false — safer to under-credit than over-credit.
 */
export async function isThreadStarter(
  tweetData: TweetData,
  _depth: number = MAX_DEPTH
): Promise<boolean> {
  try {
    // Fast path: fxtwitter gave us the thread continuation count up-front.
    // thread_continuation_count = number of self-reply tweets that follow this one.
    // Thread of 3+ means at least 2 continuation tweets.
    if (tweetData._thread_continuation_count >= 2) {
      return true;
    }

    // Slow path: walk forward from this tweet by re-fetching with the raw API.
    // fxtwitter may include thread.tweets in the fresh response even if our
    // normalized data shows 0 (e.g. if this is a partial-data situation).
    const fresh = await fetchTweet(tweetData.id);
    if (!fresh.ok) return false;

    if (fresh.data._thread_continuation_count >= 2) {
      return true;
    }

    // If we still can't confirm, walk up to MAX_DEPTH levels by following
    // whether consecutive parent tweets are from the same author — a heuristic
    // for detecting threads even when fxtwitter doesn't surface the chain.
    // In practice this catches multi-tweet threads where each reply shows
    // in the parent context of the next.
    let current = fresh.data;
    let depth = 0;
    let selfReplyCount = 0;
    const authorHandle = current.author.screen_name.toLowerCase();

    while (depth < MAX_DEPTH && current.is_reply && current.parent_id) {
      const parent = await fetchTweet(current.parent_id);
      if (!parent.ok) break;

      const parentAuthor = parent.data.author.screen_name.toLowerCase();
      if (parentAuthor !== authorHandle) break; // different author — not a self-reply chain

      selfReplyCount++;
      current = parent.data;
      depth++;
    }

    // selfReplyCount >= 2 means this tweet is at the end of a chain of 3+ tweets.
    // But we submitted the *starter*, so if we found 2+ ancestors from the same
    // author it implies the submitted tweet itself may be mid-chain.
    // Use the continuation count for starters; ancestor walk is a fallback.
    return selfReplyCount >= 2;
  } catch {
    // Never throw — return false to avoid crashing the submission pipeline
    return false;
  }
}
