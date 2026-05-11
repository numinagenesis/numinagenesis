import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
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

// ── Generate verification code ────────────────────────────────────────────────

function generateVerificationCode(): string {
  return "NM-" + randomBytes(4).toString("hex");
}

// ── Fetch tweet data via fxtwitter ────────────────────────────────────────────

async function fetchTweetData(
  tweetUrl: string
): Promise<{ author: string; text: string } | null> {
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
    const data  = await res.json();
    const tweet = data?.tweet ?? null;
    if (!tweet) return null;
    const author     = tweet?.author ?? tweet?.user ?? null;
    const screenName = (author?.screen_name ?? author?.handle ?? null) as string | null;
    const text       = (tweet?.text ?? tweet?.full_text ?? null) as string | null;
    if (!screenName || !text) return null;
    return { author: screenName.toLowerCase(), text };
  } catch {
    return null;
  }
}

// ── POST /api/collab — public, no auth required ───────────────────────────────
//
// Two actions differentiated by body shape:
//   Step 1 (form submit)  — body has group_name, group_twitter, etc.
//                           → inserts draft row, returns { submission_id, verification_code }
//   Step 2 (tweet verify) — body has submission_id + tweet_url
//                           → verifies tweet, updates draft to pending, returns { success }

export async function POST(req: NextRequest) {
  let body: {
    // Step 1 fields
    group_name?:        string;
    group_twitter?:     string;
    requested_spots?:   number | null;
    wl_type?:           string;
    submitter_twitter?: string;
    notes?:             string | null;
    // Step 2 fields
    submission_id?:     string;
    tweet_url?:         string;
    // Legacy compat
    project_name?:      string;
    twitter_handle?:    string;
    offering?:          string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_body", message: "Invalid JSON" },
      { status: 400 }
    );
  }

  // ── Step 2: Tweet verification ────────────────────────────────────────────

  if (body.submission_id) {
    const submissionId = body.submission_id.trim();
    const tweetUrl     = (body.tweet_url ?? "").trim();

    if (!tweetUrl) {
      return NextResponse.json(
        { code: "missing_field", message: "Tweet URL is required" },
        { status: 400 }
      );
    }

    // Fetch the draft row
    const { data: draft, error: fetchError } = await supabaseAdmin
      .from("collab_requests")
      .select("id, group_twitter, twitter_handle, verification_code, status")
      .eq("id", submissionId)
      .maybeSingle();

    if (fetchError || !draft) {
      return NextResponse.json(
        { code: "not_found", message: "Submission not found" },
        { status: 404 }
      );
    }

    if (draft.status !== "draft") {
      return NextResponse.json(
        { code: "already_submitted", message: "This request has already been submitted" },
        { status: 400 }
      );
    }

    // Fetch tweet data
    const tweetData = await fetchTweetData(tweetUrl);

    if (!tweetData) {
      return NextResponse.json(
        { code: "fetch_failed", message: "Could not fetch that tweet. Check the URL and try again." },
        { status: 400 }
      );
    }

    // Check tweet author matches group_twitter
    const expectedHandle = ((draft.group_twitter ?? draft.twitter_handle) as string)
      .replace(/^@/, "")
      .toLowerCase();

    if (tweetData.author !== expectedHandle) {
      return NextResponse.json(
        {
          code:    "wrong_tweet_author",
          message: `Tweet not posted by @${expectedHandle}. Post from your group account.`,
        },
        { status: 400 }
      );
    }

    // Check verification code present in tweet text
    const code = draft.verification_code as string;
    if (!tweetData.text.includes(code)) {
      return NextResponse.json(
        {
          code:    "code_not_found",
          message: `Verification code not found in tweet. Make sure to post the exact text provided.`,
        },
        { status: 400 }
      );
    }

    // Update draft → pending
    const { error: updateError } = await supabaseAdmin
      .from("collab_requests")
      .update({
        status:             "pending",
        tweet_verified:     true,
        verification_tweet: tweetUrl,
      })
      .eq("id", submissionId);

    if (updateError) {
      console.error("[collab POST step2] update error", updateError);
      return NextResponse.json(
        { code: "db_error", message: "Failed to submit request" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  }

  // ── Step 1: Initial form submit — insert draft ────────────────────────────

  const group_name        = (body.group_name        ?? body.project_name   ?? "").trim();
  const group_twitter     = (body.group_twitter      ?? body.twitter_handle ?? "").trim();
  const requested_spots   =  body.requested_spots   ?? null;
  const wl_type           = (body.wl_type            ?? "GTD").trim();
  const submitter_twitter = (body.submitter_twitter  ?? "").trim();
  const notes             =  body.notes?.trim()      || null;

  // Required field validation
  if (!group_name)        return NextResponse.json({ code: "missing_field", message: "Group name is required" },           { status: 400 });
  if (!group_twitter)     return NextResponse.json({ code: "missing_field", message: "Group Twitter handle is required" }, { status: 400 });
  if (!submitter_twitter) return NextResponse.json({ code: "missing_field", message: "Your Twitter handle is required" },  { status: 400 });

  if (requested_spots !== null && requested_spots > 50) {
    return NextResponse.json(
      { code: "invalid_field", message: "Max 50 spots per partner" },
      { status: 400 }
    );
  }

  const handle          = group_twitter.replace(/^@/, "").toLowerCase();
  const submitterHandle = submitter_twitter.replace(/^@/, "").toLowerCase();

  // One submission per group Twitter (draft, pending, or approved — not rejected)
  const { data: existing } = await supabaseAdmin
    .from("collab_requests")
    .select("id")
    .ilike("group_twitter", handle)
    .neq("status", "rejected")
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        code:    "already_exists",
        message: `A request from @${handle} already exists. Check status at /collab/status`,
      },
      { status: 400 }
    );
  }

  const verification_code = generateVerificationCode();

  // Insert as "draft" (invisible to admin queue until tweet verified)
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("collab_requests")
    .insert({
      // Core / legacy columns (kept for admin UI compat)
      project_name:       group_name,
      twitter_handle:     handle,
      wallet:             submitterHandle,
      offering:           wl_type,
      verification_tweet: "",   // filled when step 2 completes
      status:             "draft",
      // New columns
      group_name,
      group_twitter:      handle,
      wl_type,
      submitter_twitter:  submitterHandle,
      notes,
      requested_spots,
      tweet_verified:     false,
      verification_code,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[collab POST step1] insert error", insertError);
    return NextResponse.json(
      { code: "db_error", message: "Failed to save request" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    submission_id:      inserted.id,
    verification_code,
  });
}
