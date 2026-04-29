import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/admin/queue
 *
 * Admin-only. Returns pending submissions (most recent first, limit 50)
 * plus the total pending count.
 *
 * Used by /admin page to display the pending count link.
 * The /admin/queue page fetches directly from supabaseAdmin server-side.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  const { data: submissions, count, error } = await supabaseAdmin
    .from("submissions")
    .select(
      "id, wallet_address, tweet_url, points_awarded, created_at, raw_data",
      { count: "exact" }
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[admin/queue] fetch error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    count: count ?? 0,
    submissions: submissions ?? [],
  });
}
