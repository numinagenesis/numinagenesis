import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseTweetUrl } from "@/lib/parse-tweet-url";

// ── GET /api/collab — admin only, returns pending count ───────────────────────

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ code: "unauthorized" }, { status: auth.status });
  }

  const { count, error } = await supabaseAdmin
    .from("collab_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ count: 0 });
  }

  return NextResponse.json({ count: count ?? 0 });
}

// ── Fetch tweet author via fxtwitter ──────────────────────────────────────────

async function fetchTweetAuthor(tweetUrl: string): Promise<string | null> {
  const parsed = parseTweetUrl(tweetUrl);
  if (!parsed.ok) return null;

  try {
    const res = await fetch(
      `https://api.fxtwitter.com/status/${parsed.tweetId}`,
      {
        headers: { "User-Agent": "NUMINA/1.0" },
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const author = data?.tweet?.author ?? data?.tweet?.user ?? null;
    return (author?.screen_name ?? author?.handle ?? null) as string | null;
  } catch {
    return null;
  }
}

// ── POST /api/collab — public, no auth required ───────────────────────────────

export async function POST(req: NextRequest) {
  let body: {
    group_name?:         string;
    group_twitter?:      string;
    requested_spots?:    number | null;
    wl_type?:            string;
    submitter_twitter?:  string;
    notes?:              string | null;
    verification_tweet?: string;
    // Legacy compat
    project_name?:       string;
    twitter_handle?:     string;
    offering?:           string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_body", message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const group_name        = (body.group_name        ?? body.project_name   ?? "").trim();
  const group_twitter     = (body.group_twitter      ?? body.twitter_handle ?? "").trim();
  const requested_spots   = body.requested_spots    ?? null;
  const wl_type           = (body.wl_type           ?? "GTD").trim();
  const submitter_twitter = (body.submitter_twitter  ?? "").trim();
  const notes             = body.notes?.trim()      || null;
  const verification_tweet = (body.verification_tweet ?? "").trim();

  // Required field validation
  if (!group_name)         return NextResponse.json({ code: "missing_field", message: "Group name is required" },           { status: 400 });
  if (!group_twitter)      return NextResponse.json({ code: "missing_field", message: "Group Twitter handle is required" }, { status: 400 });
  if (!submitter_twitter)  return NextResponse.json({ code: "missing_field", message: "Your Twitter handle is required" },  { status: 400 });
  if (!verification_tweet) return NextResponse.json({ code: "missing_field", message: "Verification tweet is required" },  { status: 400 });

  if (requested_spots !== null && requested_spots > 50) {
    return NextResponse.json({ code: "invalid_field", message: "Max 50 spots per partner" }, { status: 400 });
  }

  const handle          = group_twitter.replace(/^@/, "").toLowerCase();
  const submitterHandle = submitter_twitter.replace(/^@/, "").toLowerCase();

  // Check if this group twitter already has an approved request
  const { data: existing } = await supabaseAdmin
    .from("collab_requests")
    .select("id, status")
    .eq("twitter_handle", handle)
    .eq("status", "approved")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { code: "already_approved", message: "This Twitter account already has an approved collaboration" },
      { status: 400 }
    );
  }

  // ── Tweet verification ────────────────────────────────────────────────────

  let tweet_verified = false;

  const tweetAuthor = await fetchTweetAuthor(verification_tweet);

  if (tweetAuthor !== null) {
    // Author fetched — compare to group_twitter
    if (tweetAuthor.toLowerCase() !== handle) {
      return NextResponse.json(
        {
          code: "wrong_tweet_author",
          message: `Tweet not posted by @${handle}. Post the verification tweet from that account first.`,
        },
        { status: 400 }
      );
    }
    tweet_verified = true;
  }
  // If tweetAuthor is null (fxtwitter failed), proceed with tweet_verified = false for manual review

  // ── Insert ────────────────────────────────────────────────────────────────

  const { error: insertError } = await supabaseAdmin
    .from("collab_requests")
    .insert({
      // Core / legacy columns (kept for admin UI compat)
      project_name:       group_name,
      twitter_handle:     handle,
      wallet:             submitterHandle,
      offering:           wl_type,
      verification_tweet,
      status:             "pending",
      // New columns
      group_name,
      group_twitter:      handle,
      wl_type,
      submitter_twitter:  submitterHandle,
      notes,
      requested_spots,
      tweet_verified,
    });

  if (insertError) {
    console.error("[collab POST] insert error", insertError);
    return NextResponse.json(
      { code: "db_error", message: "Failed to save request" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, tweet_verified });
}
