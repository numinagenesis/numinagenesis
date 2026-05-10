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
    // Section 1
    group_name?:          string;
    group_twitter?:       string;
    // Section 2
    discord_server_name?: string;
    discord_guild_id?:    string;
    discord_role_name?:   string;
    discord_role_id?:     string;
    discord_members?:     number | null;
    avg_raffle_entries?:  number | null;
    // Section 3
    requested_spots?:     number | null;
    wl_type?:             string;
    // Section 4
    submitter_twitter?:   string;
    notes?:               string | null;
    verification_tweet?:  string;
    wallet?:              string;
    // Legacy fields (backwards compat)
    project_name?:        string;
    twitter_handle?:      string;
    offering?:            string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_body", message: "Invalid JSON" },
      { status: 400 }
    );
  }

  // Support both new field names and legacy names
  const group_name         = (body.group_name         ?? body.project_name   ?? "").trim();
  const group_twitter      = (body.group_twitter       ?? body.twitter_handle ?? "").trim();
  const discord_server_name = (body.discord_server_name ?? "").trim();
  const discord_guild_id   = (body.discord_guild_id   ?? "").trim();
  const discord_role_name  = (body.discord_role_name  ?? "").trim();
  const discord_role_id    = (body.discord_role_id    ?? "").trim();
  const discord_members    = body.discord_members    ?? null;
  const avg_raffle_entries = body.avg_raffle_entries ?? null;
  const requested_spots    = body.requested_spots    ?? null;
  const wl_type            = (body.wl_type ?? "GTD").trim();
  const submitter_twitter  = (body.submitter_twitter ?? "").trim();
  const notes              = body.notes?.trim() || null;
  const verification_tweet = (body.verification_tweet ?? "").trim();
  const wallet             = (body.wallet ?? "").trim();

  // Required field validation
  if (!group_name)         return NextResponse.json({ code: "missing_field", message: "Group name is required" },             { status: 400 });
  if (!group_twitter)      return NextResponse.json({ code: "missing_field", message: "Group Twitter handle is required" },   { status: 400 });
  if (!discord_server_name) return NextResponse.json({ code: "missing_field", message: "Discord server name is required" },  { status: 400 });
  if (!discord_guild_id)   return NextResponse.json({ code: "missing_field", message: "Discord server ID is required" },     { status: 400 });
  if (!discord_role_name)  return NextResponse.json({ code: "missing_field", message: "Discord role name is required" },     { status: 400 });
  if (!discord_role_id)    return NextResponse.json({ code: "missing_field", message: "Discord role ID is required" },       { status: 400 });
  if (!submitter_twitter)  return NextResponse.json({ code: "missing_field", message: "Your Twitter handle is required" },   { status: 400 });
  if (!verification_tweet) return NextResponse.json({ code: "missing_field", message: "Verification tweet is required" },    { status: 400 });
  if (!wallet)             return NextResponse.json({ code: "missing_field", message: "Wallet address is required" },        { status: 400 });

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

  const { error: insertError } = await supabaseAdmin
    .from("collab_requests")
    .insert({
      // Core / legacy columns
      project_name:        group_name,
      twitter_handle:      handle,
      wallet:              wallet.toLowerCase(),
      offering:            wl_type,
      verification_tweet,
      status:              "pending",
      // New columns
      discord_server_name,
      discord_guild_id,
      discord_role_name,
      discord_role_id,
      discord_members,
      avg_raffle_entries,
      wl_type,
      submitter_twitter:   submitterHandle,
      notes,
      requested_spots,
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
