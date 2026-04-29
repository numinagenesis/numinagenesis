import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session-user";
import { getConfig } from "@/lib/config-cache";
import { validateSubmission } from "@/lib/validate-submission";
import { calculateTier, type TierConfig } from "@/lib/tier-calc";
import { supabaseAdmin } from "@/lib/supabase-admin";

type CampaignState = { active: boolean; message: string };

type ModerationConfig = {
  manualReviewAboveTier: string | null;
  manualReviewKeywords: string[];
};

const MOD_DEFAULTS: ModerationConfig = {
  manualReviewAboveTier: null,
  manualReviewKeywords: [],
};

/**
 * POST /api/submissions/create
 * Body: { tweetUrl: string }
 *
 * Validates and records a tweet submission.
 * Requires an active SIWE session.
 *
 * DB operation order (FK constraint: submissions.wallet_address → wallets.address):
 *   1. UPSERT wallet row           ← must happen first (FK guarantee)
 *   2. READ wallet current state   ← needed for moderation tier check
 *   3. Determine submission status ← "approved" or "pending" per moderation config
 *   4. INSERT submission           ← with computed status
 *   5. UPDATE wallet totals        ← points only if approved; count always
 *   6. UPSERT x_account_activity   ← non-critical tracking
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
  // Must happen before the submission INSERT (FK constraint on wallet_address).
  // New wallet → row created with DB DEFAULTs (total_points=0, submission_count=0).
  // Existing wallet → last_active_at refreshed; totals untouched.

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

  // ── STEP 2: Read wallet current state ─────────────────────────────────────
  //
  // Needed before the insert so the moderation tier check sees the wallet's
  // points *before* this submission is counted.

  const { data: walletRow, error: walletReadError } = await supabaseAdmin
    .from("wallets")
    .select("total_points, submission_count, first_seen_at")
    .eq("address", walletAddress)
    .single();

  if (walletReadError) {
    console.error("[submissions/create] wallet read error (tier check disabled)", walletReadError);
    // Proceed — tier check will be skipped, defaults to auto-approve
  }

  // ── STEP 3: Determine submission status ───────────────────────────────────
  //
  // Default: "approved". Moderation config can flip to "pending" based on:
  //   a) Keyword match in tweet text (case-insensitive)
  //   b) Wallet's current tier at or above manualReviewAboveTier threshold

  let subStatus: "approved" | "pending" = "approved";

  // Load moderation config + tiers in parallel (both cached)
  let modConfig: ModerationConfig;
  let tiers: TierConfig[];

  try {
    [modConfig, tiers] = await Promise.all([
      getConfig<ModerationConfig>("moderation").catch(() => ({ ...MOD_DEFAULTS })),
      getConfig<TierConfig[]>("tiers").catch(() => []),
    ]);
  } catch {
    modConfig = { ...MOD_DEFAULTS };
    tiers = [];
  }

  // a) Keyword check
  if (modConfig.manualReviewKeywords.length > 0) {
    const textLower = tweetData.text.toLowerCase();
    const hit = modConfig.manualReviewKeywords.some(
      (kw) => kw && textLower.includes(kw.toLowerCase())
    );
    if (hit) subStatus = "pending";
  }

  // b) Tier threshold check (only if still auto-approved and tier is configured)
  if (subStatus === "approved" && modConfig.manualReviewAboveTier && !walletReadError) {
    const currentPoints = walletRow?.total_points ?? 0;
    const currentTier = calculateTier(currentPoints, tiers);
    if (currentTier) {
      const thresholdTier = tiers.find(
        (t) => t.name.toUpperCase() === modConfig.manualReviewAboveTier!.toUpperCase()
      );
      // Wallet is at or above the threshold tier → flag for review
      if (thresholdTier && currentTier.threshold >= thresholdTier.threshold) {
        subStatus = "pending";
      }
    }
  }

  // ── STEP 4: Insert submission ─────────────────────────────────────────────

  const { error: insertError } = await supabaseAdmin
    .from("submissions")
    .insert({
      wallet_address: walletAddress,
      tweet_url: canonicalUrl,
      tweet_id: tweetId,
      tweet_author: tweetAuthor,
      x_account_id: xAccountId,
      tweet_text_hash: tweetTextHash,
      status: subStatus,
      points_awarded: points,
      raw_data: tweetData,
      // verified_at only set on auto-approve; stays null until admin approves pending
      verified_at: subStatus === "approved" ? now : null,
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

  // ── STEP 5: Update wallet totals ──────────────────────────────────────────
  //
  // Points: only awarded on auto-approve. Pending submissions hold points
  //         until admin approval (see /api/admin/moderate).
  // Count:  always incremented — it tracks total submissions made.
  // first_seen_at: set only for brand-new wallets.

  const pointsToAward = subStatus === "approved" ? points : 0;
  const newTotal      = (walletRow?.total_points    ?? 0) + pointsToAward;
  const newCount      = (walletRow?.submission_count ?? 0) + 1;
  const firstSeenUpdate = walletRow?.first_seen_at ? {} : { first_seen_at: now };

  const { error: walletUpdateError } = await supabaseAdmin
    .from("wallets")
    .update({
      total_points:     newTotal,
      submission_count: newCount,
      last_active_at:   now,
      ...firstSeenUpdate,
    })
    .eq("address", walletAddress);

  if (walletUpdateError) {
    // Submission recorded; points may be off — log and continue.
    console.error("[submissions/create] wallet update error", walletUpdateError);
  }

  // ── STEP 6: Upsert x_account_activity ────────────────────────────────────
  //
  // Non-critical tracking — failure is logged and ignored.

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

  const tier = calculateTier(newTotal, tiers);

  return NextResponse.json({
    ok: true,
    status: subStatus,
    pointsAwarded: pointsToAward,
    newTotal,
    tier,
  });
}
