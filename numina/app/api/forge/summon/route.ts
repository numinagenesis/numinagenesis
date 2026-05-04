import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { requireUser } from "@/lib/session-user";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { DIVISIONS, TIERS, type DivisionKey, type TierKey } from "@/lib/divisions";

const DIV_KEYS = Object.keys(DIVISIONS) as DivisionKey[];
const TIER_KEYS = Object.keys(TIERS) as TierKey[];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickDivision(): DivisionKey {
  return randomFrom(DIV_KEYS);
}

function pickTier(): TierKey {
  const roll = Math.random() * 100;
  return roll < 3 ? "prime" : roll < 15 ? "director" : roll < 40 ? "operator" : "recruit";
}

// Satisfy TS — TIER_KEYS used only to keep import clean (no dead-import lint error)
void TIER_KEYS;

export async function POST(_req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const wallet = auth.address;

  // Return existing active agent if present
  const { data: existing } = await supabaseAdmin
    .from("pre_mint_agents")
    .select("*")
    .eq("wallet", wallet)
    .eq("is_active", true)
    .maybeSingle();

  if (existing) {
    const { data: fragRow } = await supabaseAdmin
      .from("soul_fragments")
      .select("balance")
      .eq("wallet", wallet)
      .maybeSingle();

    return NextResponse.json({ agent: existing, fragments: fragRow?.balance ?? 0 });
  }

  // Generate new agent attributes
  const division = pickDivision();
  const tier = pickTier();
  const fragmentNum = 1000 + Math.floor(Math.random() * 9000);
  const fragmentId = `Fragment #${fragmentNum}`;
  const timestamp = new Date().toISOString();
  const soulHash = createHash("sha256")
    .update(division + tier + wallet + timestamp)
    .digest("hex");

  // Ensure wallet row exists (FK: pre_mint_agents.wallet → wallets.address)
  await supabaseAdmin
    .from("wallets")
    .upsert(
      { address: wallet, last_active_at: timestamp },
      { onConflict: "address", ignoreDuplicates: false }
    );

  // Insert agent record
  const { data: agent, error: agentError } = await supabaseAdmin
    .from("pre_mint_agents")
    .insert({ wallet, division, tier, fragment_id: fragmentId, soul_hash: soulHash, is_active: true })
    .select()
    .single();

  if (agentError || !agent) {
    console.error("[forge/summon] agent insert error", agentError);
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }

  // Insert soul_fragments row (idempotent — 23505 = already exists)
  const { error: fragError } = await supabaseAdmin
    .from("soul_fragments")
    .insert({ wallet, balance: 0 });

  if (fragError && fragError.code !== "23505") {
    console.error("[forge/summon] soul_fragments insert error", fragError);
  }

  return NextResponse.json({ agent, fragments: 0 });
}
