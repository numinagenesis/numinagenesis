import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { requireUser } from "@/lib/session-user";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { DIVISIONS, type DivisionKey } from "@/lib/divisions";

const DIV_KEYS = Object.keys(DIVISIONS) as DivisionKey[];
const BURN_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickDivision(): DivisionKey {
  return randomFrom(DIV_KEYS);
}

function pickTier(): string {
  const roll = Math.random() * 100;
  return roll < 3 ? "prime" : roll < 15 ? "director" : roll < 40 ? "operator" : "recruit";
}

export async function POST(_req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const wallet = auth.address;

  // Get active agent
  const { data: agent } = await supabaseAdmin
    .from("pre_mint_agents")
    .select("*")
    .eq("wallet", wallet)
    .eq("is_active", true)
    .maybeSingle();

  if (!agent) {
    return NextResponse.json({ error: "No active agent" }, { status: 404 });
  }

  // Check burn cooldown — most recent inactive agent with a burned_at timestamp
  const { data: lastBurned } = await supabaseAdmin
    .from("pre_mint_agents")
    .select("burned_at")
    .eq("wallet", wallet)
    .eq("is_active", false)
    .not("burned_at", "is", null)
    .order("burned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastBurned?.burned_at) {
    const nextBurnAt = new Date(lastBurned.burned_at).getTime() + BURN_COOLDOWN_MS;
    if (Date.now() < nextBurnAt) {
      return NextResponse.json(
        { error: "Burn cooldown active", next_burn_at: new Date(nextBurnAt).toISOString() },
        { status: 429 }
      );
    }
  }

  // Get current fragment balance
  const { data: fragRow } = await supabaseAdmin
    .from("soul_fragments")
    .select("balance")
    .eq("wallet", wallet)
    .maybeSingle();

  const balance = fragRow?.balance ?? 0;
  const carryOver = Math.floor(balance * 0.5);
  const lostFragments = balance - carryOver;
  const now = new Date().toISOString();

  // Mark old agent burned
  await supabaseAdmin
    .from("pre_mint_agents")
    .update({ is_active: false, burned_at: now })
    .eq("id", agent.id);

  // Generate new agent
  const division = pickDivision();
  const tier = pickTier();
  const fragmentNum = 1000 + Math.floor(Math.random() * 9000);
  const fragmentId = `Fragment #${fragmentNum}`;
  const soulHash = createHash("sha256")
    .update(division + tier + wallet + now)
    .digest("hex");

  const { data: newAgent, error: insertError } = await supabaseAdmin
    .from("pre_mint_agents")
    .insert({
      wallet,
      division,
      tier,
      fragment_id: fragmentId,
      soul_hash:   soulHash,
      is_active:   true,
      task_count:  0,
    })
    .select()
    .single();

  if (insertError || !newAgent) {
    console.error("[forge/burn] new agent insert error", insertError);
    return NextResponse.json({ error: "Failed to create new agent" }, { status: 500 });
  }

  // Update fragment balance (carry-over)
  await supabaseAdmin
    .from("soul_fragments")
    .upsert({ wallet, balance: carryOver, updated_at: now }, { onConflict: "wallet" });

  return NextResponse.json({
    new_agent:        newAgent,
    carried_fragments: carryOver,
    lost_fragments:    lostFragments,
  });
}
