import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

// ── POST /api/collab — public, no auth required ───────────────────────────────

export async function POST(req: NextRequest) {
  let body: {
    project_name?: string;
    twitter_handle?: string;
    wallet?: string;
    offering?: string;
    verification_tweet?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_body", message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const { project_name, twitter_handle, wallet, offering, verification_tweet } = body;

  if (!project_name?.trim()) {
    return NextResponse.json({ code: "missing_field", message: "project_name is required" }, { status: 400 });
  }
  if (!twitter_handle?.trim()) {
    return NextResponse.json({ code: "missing_field", message: "twitter_handle is required" }, { status: 400 });
  }
  if (!wallet?.trim()) {
    return NextResponse.json({ code: "missing_field", message: "wallet is required" }, { status: 400 });
  }
  if (!offering?.trim()) {
    return NextResponse.json({ code: "missing_field", message: "offering is required" }, { status: 400 });
  }
  if (!verification_tweet?.trim()) {
    return NextResponse.json({ code: "missing_field", message: "verification_tweet is required" }, { status: 400 });
  }

  const handle = twitter_handle.trim().replace(/^@/, "").toLowerCase();

  // Check if this twitter handle already has an approved request
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

  const { error: insertError } = await supabaseAdmin
    .from("collab_requests")
    .insert({
      project_name: project_name.trim(),
      twitter_handle: handle,
      wallet: wallet.trim().toLowerCase(),
      offering: offering.trim(),
      verification_tweet: verification_tweet.trim(),
      status: "pending",
    });

  if (insertError) {
    console.error("[collab POST] insert error", insertError);
    return NextResponse.json(
      { code: "db_error", message: "Failed to save request" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
