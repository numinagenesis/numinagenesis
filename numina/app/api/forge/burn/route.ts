import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session-user";
import { supabaseAdmin } from "@/lib/supabase-admin";

const TIER_ORDER = ["RECRUIT", "OPERATOR", "DIRECTOR", "NUMINA PRIME"];
const BURN_COOLDOWN_HOURS = 24;

// ── POST /api/forge/burn ──────────────────────────────────────────────────────

export async function POST() {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }
  const wallet = auth.address.toLowerCase();

  // Fetch current agent
  const { data: agent, error: agentError } = await supabaseAdmin
    .from("pre_mint_agents")
    .select("*")
    .eq("wallet", wallet)
    .maybeSingle();

  if (agentError || !agent) {
    return NextResponse.json({ error: "No agent found for this wallet" }, { status: 404 });
  }

  // Check burn cooldown — query most recent burned_at across all rows for wallet
  const { data: lastBurnRow } = await supabaseAdmin
    .from("pre_mint_agents")
    .select("burned_at")
    .eq("wallet", wallet)
    .not("burned_at", "is", null)
    .order("burned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastBurnRow?.burned_at) {
    const nextBurn = new Date(lastBurnRow.burned_at);
    nextBurn.setHours(nextBurn.getHours() + BURN_COOLDOWN_HOURS);
    if (nextBurn > new Date()) {
      return NextResponse.json(
        { error: "Burn cooldown active", next_burn_at: nextBurn.toISOString() },
        { status: 429 }
      );
    }
  }

  // Fetch current fragment balance
  const { data: fragmentRow } = await supabaseAdmin
    .from("soul_fragments")
    .select("current_balance")
    .eq("wallet", wallet)
    .maybeSingle();

  const currentFragments = fragmentRow?.current_balance ?? 0;
  const carriedFragments = Math.floor(currentFragments * 0.5);

  // Calculate next tier
  const currentTierIndex = TIER_ORDER.indexOf(agent.tier?.toUpperCase() ?? "RECRUIT");
  const nextTier = TIER_ORDER[Math.min(currentTierIndex + 1, TIER_ORDER.length - 1)];

  // Update agent tier and burn timestamp
  const { data: newAgent, error: updateError } = await supabaseAdmin
    .from("pre_mint_agents")
    .update({ tier: nextTier, burned_at: new Date().toISOString() })
    .eq("wallet", wallet)
    .select("*")
    .single();

  if (updateError || !newAgent) {
    console.error("[forge/burn] update agent", updateError);
    return NextResponse.json({ error: "Failed to upgrade agent" }, { status: 500 });
  }

  // Update fragment balance to carry-over amount
  const { error: fragError } = await supabaseAdmin
    .from("soul_fragments")
    .upsert({ wallet, current_balance: carriedFragments }, { onConflict: "wallet" });

  if (fragError) {
    console.error("[forge/burn] update soul_fragments", fragError);
    // Non-fatal — agent upgraded, fragments may be stale
  }

  return NextResponse.json({
    new_agent:         newAgent,
    carried_fragments: carriedFragments,
  });
}
