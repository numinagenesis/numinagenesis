import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { requireUser } from "@/lib/session-user";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { DIVISIONS, TIERS, type DivisionKey, type TierKey } from "@/lib/divisions";
import { FRAGMENT_RATES } from "@/lib/fragment-rates";
import { getForgeConfig } from "@/lib/forge-config";

async function pickAndFetchPersona(personas: string[], fallback: string): Promise<string> {
  if (personas.length === 0) return fallback;
  const url = personas[Math.floor(Math.random() * personas.length)];
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (res.ok) return await res.text();
  } catch { /* fall through to fallback */ }
  return fallback;
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const wallet = auth.address;

  const forgeConfig = await getForgeConfig();
  const DAILY_LIMIT = forgeConfig.daily_task_limit;
  const INPUT_MAX   = forgeConfig.max_task_input;

  // ── Get active agent ──────────────────────────────────────────────────────
  const { data: agent } = await supabaseAdmin
    .from("pre_mint_agents")
    .select("*")
    .eq("wallet", wallet)
    .eq("is_active", true)
    .maybeSingle();

  if (!agent) {
    return NextResponse.json({ error: "No active agent" }, { status: 400 });
  }

  // ── Daily limit check ─────────────────────────────────────────────────────
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const { count: rawCount } = await supabaseAdmin
    .from("training_tasks")
    .select("*", { count: "exact", head: true })
    .eq("wallet", wallet)
    .gte("created_at", startOfToday.toISOString());

  const tasksToday = rawCount ?? 0;
  if (tasksToday >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: `Daily limit reached (${DAILY_LIMIT} tasks/day)`, tasks_today: tasksToday },
      { status: 429 }
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let input: string;
  try {
    const body = await req.json();
    input = String(body?.input ?? "").trim().slice(0, INPUT_MAX);
    if (!input) throw new Error("empty");
  } catch {
    return NextResponse.json({ error: "input is required" }, { status: 400 });
  }

  // ── Build system prompt ───────────────────────────────────────────────────
  const div = DIVISIONS[agent.division as DivisionKey];
  if (!div) {
    return NextResponse.json({ error: "Unknown division" }, { status: 400 });
  }

  const tierKey   = agent.tier as TierKey;
  const tierLabel = tierKey === "prime" ? "NUMINA PRIME" : tierKey.toUpperCase();

  const personaText = await pickAndFetchPersona(div.personas, div.fallbackPersona);

  const systemPrompt = `${personaText}

---
NUMINA CONTEXT:
${div.web3Overlay}

---
TIER DIRECTIVE:
Your tier is: ${tierLabel}. Respond accordingly.

RECRUIT: Concise. Cover the basics well. 2-3 key points max. No fluff.
OPERATOR: Structured. Go deeper. Use frameworks. 3-5 key points with clear reasoning.
DIRECTOR: Comprehensive. Multiple frameworks. Anticipate follow-up questions. Show full thinking.
NUMINA PRIME: Authoritative. Peer-level depth. Challenge assumptions if needed. Deliver what wasn't asked for but should have been. This is your domain. Act like it.

If asked something outside your expertise, respond:
"That is not my domain. I am ${div.name.toUpperCase()}. Give me a task related to ${div.description.toLowerCase()}"

You are a NUMINA agent. Division: ${div.name.toUpperCase()}. Tier: ${tierLabel}.
Be direct. Deliver real, usable output. No fluff. No disclaimers.

---
CRITICAL OUTPUT RULES:
Be brutally concise.
No preamble. No intro sentences.
No 'Great question' or 'Certainly'.
No bullet point walls.
No excessive formatting.
Deliver the output directly.
If it can be said in 3 lines, use 3 lines.
You are a specialist, not a teacher.
Act like it.`;

  // ── OpenRouter call ───────────────────────────────────────────────────────
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
  }

  const llmRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer":  "https://numinagenesis.vercel.app",
      "X-Title":       "NUMINA Agent",
    },
    body: JSON.stringify({
      model:      "openrouter/free",
      max_tokens: 500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: input },
      ],
    }),
  });

  const llmData = await llmRes.json();
  if (!llmData.choices?.[0]) {
    return NextResponse.json(
      { error: `LLM error: ${JSON.stringify(llmData)}` },
      { status: 502 }
    );
  }

  const output: string = llmData.choices[0].message.content ?? "";
  const taskHash = createHash("sha256").update(input + output).digest("hex");

  // ── Compute fragments ─────────────────────────────────────────────────────
  const tierName   = TIERS[tierKey]?.name ?? "Recruit";
  const rateKey    = tierName.toUpperCase() as keyof typeof FRAGMENT_RATES;
  const fragmentsEarned = FRAGMENT_RATES[rateKey] ?? 10;

  // ── Insert training task ──────────────────────────────────────────────────
  const { error: insertError } = await supabaseAdmin
    .from("training_tasks")
    .insert({
      wallet,
      agent_id:        agent.id,
      input,
      output,
      fragments_earned: fragmentsEarned,
      task_hash:       taskHash,
    });

  if (insertError) {
    console.error("[forge/train] training_tasks insert error", insertError);
    return NextResponse.json({ error: "Failed to record task" }, { status: 500 });
  }

  // ── Increment agent task_count ────────────────────────────────────────────
  const currentTaskCount = (agent.task_count as number | null) ?? 0;
  const { error: agentUpdateError } = await supabaseAdmin
    .from("pre_mint_agents")
    .update({ task_count: currentTaskCount + 1 })
    .eq("id", agent.id);

  if (agentUpdateError) {
    console.error("[forge/train] agent task_count update error", agentUpdateError);
  }

  // ── Upsert soul_fragments balance ─────────────────────────────────────────
  const { data: fragRow } = await supabaseAdmin
    .from("soul_fragments")
    .select("balance")
    .eq("wallet", wallet)
    .maybeSingle();

  const newBalance = (fragRow?.balance ?? 0) + fragmentsEarned;

  const { error: fragError } = await supabaseAdmin
    .from("soul_fragments")
    .upsert(
      { wallet, balance: newBalance, updated_at: new Date().toISOString() },
      { onConflict: "wallet" }
    );

  if (fragError) {
    console.error("[forge/train] soul_fragments upsert error", fragError);
  }

  // ── Respond ───────────────────────────────────────────────────────────────
  return NextResponse.json({
    output,
    fragments_earned: fragmentsEarned,
    new_balance:      newBalance,
    tasks_today:      tasksToday + 1,
  });
}
