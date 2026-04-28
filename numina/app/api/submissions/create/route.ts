import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session-user";
import { getConfig } from "@/lib/config-cache";
import { validateSubmission } from "@/lib/validate-submission";
import { calculateTier } from "@/lib/tier-calc";
import { supabaseAdmin } from "@/lib/supabase-admin";

type CampaignState = { active: boolean; message: string };
type TierConfig = { name: string; threshold: number; reward: string | null };

/**
 * POST /api/submissions/create
 * Body: { tweetUrl: string }
 *
 * Validates and records a tweet submission.
 * Requires an active SIWE session.
 *
 * DB operation order (matters — FK constraint: submissions.wallet_address → wallets.address):
 *   1. UPSERT wallet row  ← must happen first so the row exists
 *   2. INSERT submission  ← safe because wallet is guaranteed present
 *   3. UPDATE wallet totals (increment points + counts)
 */
export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────

  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const walletAddress = auth.address; // already lowercase

  // ── Campaign gate ─────────────────────────────────────────────────────────

  const campaign = await getConfig<CampaignState>("campaign_state");
  if (!campaign.active) {
    return NextResponse.json(
      { code: "campaign_inactive", message: "Campaign is currently paused" },
      { status: 403 }
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────

  let tweetUrl: string;
  try {
    const body = await req.json();
    tweetUrl = String(body?.tweetUrl ?? "").trim();
    if (!tweetUrl) throw new Error("empty");
  } catch {
    return NextResponse.json(
      { code: "invalid_url", message: "tweetUrl is required" },
      { status: 400 }
    );
  }

  // ── Validation pipeline ───────────────────────────────────────────────────

  const result = await validateSubmission({ tweetUrl, walletAddress });
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: result.message },
      { status: 400 }
    );
  }

  const { points, tweetData, canonicalUrl, tweetId, tweetAuthor, tweetTextHash } = result;
  const xAccountId = tweetData.author.id || null;
  const now = new Date().toISOString();

  // ── STEP 1: Upsert wallet row ─────────────────────────────────────────────
  //
  // This MUST happen before the submission INSERT.
  // submissions.wallet_address has a FK constraint to wallets.address.
  // A new user has no wallet row yet — inserting a submission first triggers
  // Postgres error 23503 (foreign key violation).
  //
  // We upsert with only the non-aggregate fields:
  //   - New wallet   → row created; total_points/submission_count use DB DEFAULTs (0)
  //   - Existing     → last_active_at refreshed; totals untouched until step 3

  const { error: walletEnsureError } = await supabaseAdmin
    .from("wallets")
    .upsert(
      { address: walletAddress, last_active_at: now },
      { onConflict: "address", ignoreDuplicates: false }
    );

  if (walletEnsureError) {
    console.error("[submissions/create] wallet upsert error", walletEnsureError);
    return NextResponse.json(
      { code: "db_error", message: "Failed to prepare wallet record" },
      { status: 500 }
    );
  }

  // ── STEP 2: Insert submission ─────────────────────────────────────────────
  //
  // Wallet row is guaranteed to exist now.

  const { error: insertError } = await supabaseAdmin
    .from("submissions")
    .insert({
      wallet_address: walletAddress,
      tweet_url: canonicalUrl,
      tweet_id: tweetId,
      tweet_author: tweetAuthor,
      x_account_id: xAccountId,
      tweet_text_hash: tweetTextHash,
      status: "approved",
      points_awarded: points,
      raw_data: tweetData,
      verified_at: now,
    });

  if (insertError) {
    // 23505 = unique constraint — duplicate tweet_id (race condition)
    if (insertError.code === "23505") {
      return NextResponse.json(
        { code: "duplicate", message: "Already submitted" },
        { status: 400 }
      );
    }
    console.error("[submissions/create] submission insert error", insertError);
    return NextResponse.json(
      { code: "db_error", message: "Failed to record submission" },
      { status: 500 }
    );
  }

  // ── STEP 3: Increment wallet totals ───────────────────────────────────────
  //
  // Fetch the current row (just inserted or pre-existing) then write back
  // the incremented values. Also set first_seen_at if this is a brand-new wallet.

  const { data: walletRow, error: walletReadError } = await supabaseAdmin
    .from("wallets")
    .select("total_points, submission_count, first_seen_at")
    .eq("address", walletAddress)
    .single();

  if (walletReadError) {
    // Submission is already recorded — don't fail the request, just log.
    console.error("[submissions/create] wallet read error (points not incremented)", walletReadError);
  }

  const newTotal = (walletRow?.total_points ?? 0) + points;
  const newCount = (walletRow?.submission_count ?? 0) + 1;

  // first_seen_at: set only if not already populated (new wallet case)
  const firstSeenUpdate = walletRow?.first_seen_at ? {} : { first_seen_at: now };

  const { error: walletUpdateError } = await supabaseAdmin
    .from("wallets")
    .update({
      total_points: newTotal,
      submission_count: newCount,
      last_active_at: now,
      ...firstSeenUpdate,
    })
    .eq("address", walletAddress);

  if (walletUpdateError) {
    // Submission is recorded; points update failed. Log but don't 500 — user gets
    // their submission counted, points will be off but can be reconciled later.
    console.error("[submissions/create] wallet points update error", walletUpdateError);
  }

  // ── STEP 4: Upsert x_account_activity ────────────────────────────────────
  //
  // Tracks per-X-account submission activity for admin visibility.
  // Non-critical — failure is logged and ignored.

  if (xAccountId) {
    const { data: actRow } = await supabaseAdmin
      .from("x_account_activity")
      .select("submission_count")
      .eq("x_account_id", xAccountId)
      .maybeSingle();

    const newActCount = (actRow?.submission_count ?? 0) + 1;

    const { error: actError } = await supabaseAdmin
      .from("x_account_activity")
      .upsert(
        {
          x_account_id: xAccountId,
          x_handle: tweetData.author.screen_name || null,
          submission_count: newActCount,
          last_seen_at: now,
        },
        { onConflict: "x_account_id" }
      );

    if (actError) {
      console.error("[submissions/create] x_account_activity upsert error", actError);
    }
  }

  // ── Respond ───────────────────────────────────────────────────────────────

  const tiers = await getConfig<TierConfig[]>("tiers");
  const tier = calculateTier(newTotal, tiers);

  return NextResponse.json({
    ok: true,
    pointsAwarded: points,
    newTotal,
    tier,
  });
}
