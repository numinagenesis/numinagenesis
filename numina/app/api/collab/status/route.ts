import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ── GET /api/collab/status?twitter=@handle ────────────────────────────────────

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("twitter") ?? "";
  const handle = raw.replace(/^@/, "").toLowerCase().trim();

  if (!handle) {
    return NextResponse.json(
      { code: "missing_param", message: "twitter param required" },
      { status: 400 }
    );
  }

  // Try group_twitter column first, fall back to twitter_handle (legacy)
  const { data, error } = await supabaseAdmin
    .from("collab_requests")
    .select("status, spots_allocated, wl_type, tweet_verified, created_at, group_twitter, twitter_handle")
    .or(`group_twitter.ilike.${handle},twitter_handle.ilike.${handle}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[collab/status] query error", error);
    return NextResponse.json({ status: "not_found" });
  }

  if (!data) {
    return NextResponse.json({ status: "not_found" });
  }

  return NextResponse.json({
    status:          data.status,
    spots_allocated: data.spots_allocated ?? 0,
    wl_type:         data.wl_type         ?? null,
    tweet_verified:  data.tweet_verified  ?? false,
    created_at:      data.created_at,
  });
}
