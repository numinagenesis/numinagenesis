import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session-user";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentRow = {
  id: string;
  division: string;
  tier: string;
  wallet: string;
  created_at: string;
};

type ListingRow = {
  id: string;
  offerer_wallet: string;
  agent_id: string;
  wants_division: string | null;
  status: string;
  matched_wallet: string | null;
  created_at: string;
  expires_at: string;
  resolved_at: string | null;
  pre_mint_agents?: { division: string; tier: string } | null;
};

// ── GET /api/forge/swap ───────────────────────────────────────────────────────
// Public, no auth — returns all open, non-expired listings

export async function GET() {
  const now = new Date().toISOString();

  const { data: listings, error } = await supabaseAdmin
    .from("swap_listings")
    .select(
      "id, offerer_wallet, agent_id, wants_division, created_at, expires_at, pre_mint_agents!agent_id(division, tier)"
    )
    .eq("status", "open")
    .gt("expires_at", now)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[forge/swap GET]", error);
    return NextResponse.json(
      { code: "db_error", message: "Failed to load listings" },
      { status: 500 }
    );
  }

  const result = ((listings ?? []) as unknown as ListingRow[]).map((l) => ({
    id: l.id,
    offerer_wallet: l.offerer_wallet,
    division: l.pre_mint_agents?.division ?? null,
    tier: l.pre_mint_agents?.tier ?? null,
    wants_division: l.wants_division,
    created_at: l.created_at,
    expires_at: l.expires_at,
  }));

  return NextResponse.json({ listings: result });
}

// ── POST /api/forge/swap ──────────────────────────────────────────────────────
// requireUser — action: "list" | "accept" | "cancel"

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json(
      { code: "unauthorized", message: "Not signed in" },
      { status: 401 }
    );
  }
  const wallet = auth.address; // always lowercase

  let body: { action?: string; wants_division?: string | null; listing_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_body", message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const { action } = body;
  if (action === "list") return handleList(wallet, body);
  if (action === "accept") return handleAccept(wallet, body);
  if (action === "cancel") return handleCancel(wallet, body);

  return NextResponse.json(
    { code: "invalid_action", message: "action must be list | accept | cancel" },
    { status: 400 }
  );
}

// ── action = "list" ───────────────────────────────────────────────────────────

async function handleList(
  wallet: string,
  body: { wants_division?: string | null }
) {
  const wantsDivision: string | null = body.wants_division ?? null;

  // Fetch active agent for wallet
  const { data: agent, error: agentError } = await supabaseAdmin
    .from("pre_mint_agents")
    .select("id, division, tier, created_at")
    .eq("wallet", wallet)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (agentError) {
    console.error("[forge/swap list] agent fetch", agentError);
    return NextResponse.json(
      { code: "db_error", message: "Failed to fetch agent" },
      { status: 500 }
    );
  }
  if (!agent) {
    return NextResponse.json(
      { code: "no_agent", message: "No agent found for this wallet" },
      { status: 400 }
    );
  }

  // 24h minimum age
  const agentAgeMs = Date.now() - new Date(agent.created_at).getTime();
  if (agentAgeMs < 24 * 60 * 60 * 1000) {
    return NextResponse.json(
      { code: "agent_too_new", message: "Agent must be at least 24 hours old before listing" },
      { status: 400 }
    );
  }

  // Check for existing open listing
  const now = new Date().toISOString();
  const { data: existing } = await supabaseAdmin
    .from("swap_listings")
    .select("id")
    .eq("offerer_wallet", wallet)
    .eq("status", "open")
    .gt("expires_at", now)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { code: "listing_exists", message: "You already have an active listing" },
      { status: 400 }
    );
  }

  const { data: listing, error: insertError } = await supabaseAdmin
    .from("swap_listings")
    .insert({
      offerer_wallet: wallet,
      agent_id: agent.id,
      wants_division: wantsDivision,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[forge/swap list] insert", insertError);
    return NextResponse.json(
      { code: "db_error", message: "Failed to create listing" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, listing, agent });
}

// ── action = "accept" ─────────────────────────────────────────────────────────

async function handleAccept(
  wallet: string,
  body: { listing_id?: string }
) {
  const { listing_id } = body;
  if (!listing_id) {
    return NextResponse.json(
      { code: "missing_listing_id", message: "listing_id is required" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  const { data: listing, error: listingError } = await supabaseAdmin
    .from("swap_listings")
    .select("id, offerer_wallet, agent_id, status, expires_at")
    .eq("id", listing_id)
    .maybeSingle();

  if (listingError || !listing) {
    return NextResponse.json(
      { code: "not_found", message: "Listing not found" },
      { status: 404 }
    );
  }
  if (listing.status !== "open" || listing.expires_at < now) {
    return NextResponse.json(
      { code: "listing_unavailable", message: "Listing is no longer available" },
      { status: 400 }
    );
  }
  if (listing.offerer_wallet === wallet) {
    return NextResponse.json(
      { code: "own_listing", message: "Cannot accept your own listing" },
      { status: 400 }
    );
  }

  // Fetch both agents in parallel
  const [offererResult, accepterResult] = await Promise.all([
    supabaseAdmin
      .from("pre_mint_agents")
      .select("id, division, tier, wallet")
      .eq("id", listing.agent_id)
      .maybeSingle(),
    supabaseAdmin
      .from("pre_mint_agents")
      .select("id, division, tier, wallet, created_at")
      .eq("wallet", wallet)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (offererResult.error || !offererResult.data) {
    return NextResponse.json(
      { code: "agent_not_found", message: "Offerer's agent not found" },
      { status: 404 }
    );
  }
  if (accepterResult.error || !accepterResult.data) {
    return NextResponse.json(
      { code: "no_agent", message: "No agent found for your wallet" },
      { status: 400 }
    );
  }

  const offererAgent = offererResult.data as AgentRow;
  const accepterAgent = accepterResult.data as AgentRow;

  // Swap wallets on both agents — fragments stay with wallet, only division/tier moves
  const [swapA, swapB] = await Promise.all([
    supabaseAdmin
      .from("pre_mint_agents")
      .update({ wallet })
      .eq("id", offererAgent.id),
    supabaseAdmin
      .from("pre_mint_agents")
      .update({ wallet: listing.offerer_wallet })
      .eq("id", accepterAgent.id),
  ]);

  if (swapA.error || swapB.error) {
    console.error("[forge/swap accept] swap error", swapA.error, swapB.error);
    return NextResponse.json(
      { code: "db_error", message: "Swap failed" },
      { status: 500 }
    );
  }

  // Mark listing resolved
  await supabaseAdmin
    .from("swap_listings")
    .update({ status: "resolved", matched_wallet: wallet, resolved_at: now })
    .eq("id", listing_id);

  return NextResponse.json({
    ok: true,
    your_new_agent: { ...offererAgent, wallet },
    their_old_agent: { ...accepterAgent, wallet: listing.offerer_wallet },
  });
}

// ── action = "cancel" ─────────────────────────────────────────────────────────

async function handleCancel(
  wallet: string,
  body: { listing_id?: string }
) {
  const { listing_id } = body;
  if (!listing_id) {
    return NextResponse.json(
      { code: "missing_listing_id", message: "listing_id is required" },
      { status: 400 }
    );
  }

  const { data: listing, error: listingError } = await supabaseAdmin
    .from("swap_listings")
    .select("id, offerer_wallet, status")
    .eq("id", listing_id)
    .maybeSingle();

  if (listingError || !listing) {
    return NextResponse.json(
      { code: "not_found", message: "Listing not found" },
      { status: 404 }
    );
  }
  if (listing.offerer_wallet !== wallet) {
    return NextResponse.json(
      { code: "forbidden", message: "Only the offerer can cancel this listing" },
      { status: 403 }
    );
  }
  if (listing.status !== "open") {
    return NextResponse.json(
      { code: "listing_unavailable", message: "Listing is not open" },
      { status: 400 }
    );
  }

  const { error: cancelError } = await supabaseAdmin
    .from("swap_listings")
    .update({ status: "cancelled" })
    .eq("id", listing_id);

  if (cancelError) {
    console.error("[forge/swap cancel]", cancelError);
    return NextResponse.json(
      { code: "db_error", message: "Failed to cancel listing" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
