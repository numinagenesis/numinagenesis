import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session-user";
import { getConfig } from "@/lib/config-cache";
import { calculateTier, nextTierFor, tierProgress } from "@/lib/tier-calc";
import { type SybilRules } from "@/lib/validate-submission";
import { supabase } from "@/lib/supabase";

type TierConfig = { name: string; threshold: number; reward: string | null };

const SYBIL_DEFAULTS: SybilRules = {
  requireXBinding: false,
  maxXAccountSubmissionsPerDay: 3,
  minTweetSimilarityDistance: 0.7,
  minAccountFollowingCount: 0,
  minAccountTotalTweets: 0,
  blockDefaultProfileImages: false,
};

/**
 * GET /api/submissions/me
 *
 * Returns the authenticated wallet's points total, tier, and last 10 submissions.
 * Requires an active SIWE session.
 */
export async function GET() {
  // 1. Auth
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const walletAddress = auth.address;

  // 2. Fetch tiers config and sybil rules
  const tiers = await getConfig<TierConfig[]>("tiers");

  let sybilRules: SybilRules;
  try {
    sybilRules = await getConfig<SybilRules>("sybil_rules");
  } catch {
    sybilRules = { ...SYBIL_DEFAULTS };
  }

  // 3. Fetch wallet row (includes X binding info)
  const { data: wallet } = await supabase
    .from("wallets")
    .select("total_points, submission_count, banned, banned_reason, bound_x_handle")
    .eq("address", walletAddress)
    .maybeSingle();

  // New user — no wallet row yet
  if (!wallet) {
    return NextResponse.json({
      totalPoints: 0,
      tier: null,
      nextTier: nextTierFor(0, tiers),
      progress: 0,
      submissionCount: 0,
      banned: false,
      recent: [],
      boundXHandle: null,
      requireXBinding: sybilRules.requireXBinding,
    });
  }

  const totalPoints: number = wallet.total_points ?? 0;

  // 4. Fetch last 10 submissions
  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, tweet_url, status, points_awarded, created_at, rejection_note")
    .eq("wallet_address", walletAddress)
    .order("created_at", { ascending: false })
    .limit(10);

  const recent = (submissions ?? []).map((s) => ({
    id: s.id,
    tweetUrl: s.tweet_url,
    status: s.status,
    pointsAwarded: s.points_awarded,
    createdAt: s.created_at,
    rejectionNote: s.rejection_note,
  }));

  const currentTier = calculateTier(totalPoints, tiers);
  const next = nextTierFor(totalPoints, tiers);
  const progress = tierProgress(totalPoints, tiers);

  return NextResponse.json({
    totalPoints,
    tier: currentTier,
    nextTier: next,
    progress,
    submissionCount: wallet.submission_count ?? 0,
    banned: wallet.banned ?? false,
    recent,
    boundXHandle: (wallet as { bound_x_handle?: string | null }).bound_x_handle ?? null,
    requireXBinding: sybilRules.requireXBinding,
  });
}
