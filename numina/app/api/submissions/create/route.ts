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
 */
export async function POST(req: NextRequest) {
  // 1. Auth
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const walletAddress = auth.address; // already lowercase

  // 2. Campaign must be active
  const campaign = await getConfig<CampaignState>("campaign_state");
  if (!campaign.active) {
    return NextResponse.json(
      { code: "campaign_inactive", message: "Campaign is currently paused" },
      { status: 403 }
    );
  }

  // 3. Parse request body
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

  // 4. Full validation pipeline
  const result = await validateSubmission({ tweetUrl, walletAddress });
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: result.message },
      { status: 400 }
    );
  }

  const { points, tweetData, canonicalUrl, tweetId, tweetAuthor } = result;
  const now = new Date().toISOString();

  // 5a. Ensure wallet row exists; get current totals
  const { data: existingWallet } = await supabaseAdmin
    .from("wallets")
    .select("total_points, submission_count")
    .eq("address", walletAddress)
    .maybeSingle();

  const currentPoints = existingWallet?.total_points ?? 0;
  const currentCount = existingWallet?.submission_count ?? 0;
  const newTotal = currentPoints + points;
  const newCount = currentCount + 1;

  // 5b. INSERT submission row
  const { error: insertError } = await supabaseAdmin
    .from("submissions")
    .insert({
      wallet_address: walletAddress,
      tweet_url: canonicalUrl,
      tweet_id: tweetId,
      tweet_author: tweetAuthor,
      status: "approved",
      points_awarded: points,
      raw_data: tweetData,
      verified_at: now,
    });

  if (insertError) {
    // Unique constraint on tweet_id → already submitted (rare race condition)
    if (insertError.code === "23505") {
      return NextResponse.json(
        { code: "duplicate", message: "Already submitted" },
        { status: 400 }
      );
    }
    console.error("[submissions/create] insert error", insertError);
    return NextResponse.json(
      { code: "db_error", message: "Failed to record submission" },
      { status: 500 }
    );
  }

  // 5c. UPSERT wallet row (insert if new, update totals if existing)
  if (!existingWallet) {
    await supabaseAdmin.from("wallets").insert({
      address: walletAddress,
      total_points: newTotal,
      submission_count: newCount,
      banned: false,
      first_seen_at: now,
      last_active_at: now,
    });
  } else {
    await supabaseAdmin
      .from("wallets")
      .update({
        total_points: newTotal,
        submission_count: newCount,
        last_active_at: now,
      })
      .eq("address", walletAddress);
  }

  // 6. Calculate resulting tier
  const tiers = await getConfig<TierConfig[]>("tiers");
  const tier = calculateTier(newTotal, tiers);

  return NextResponse.json({
    ok: true,
    pointsAwarded: points,
    newTotal,
    tier,
  });
}
