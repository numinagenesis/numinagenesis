import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session-user";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { FRAGMENT_RATES } from "@/lib/fragment-rates";

const DEFAULT_FRAGMENTS = 10;

// Max tasks per wallet per day
const DAILY_TASK_LIMIT = 10;

// ── POST /api/forge/train ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }
  const wallet = auth.address;

  let task: string;
  try {
    const body = await req.json();
    task = typeof body.input === "string" ? body.input.trim() : "";
  } catch {
    return NextResponse.json({ code: "invalid_body" }, { status: 400 });
  }

  if (!task) {
    return NextResponse.json(
      { code: "invalid_task", message: "Task description is required" },
      { status: 400 }
    );
  }

  // Rate limit — count today's tasks
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count: tasksToday } = await supabaseAdmin
    .from("training_tasks")
    .select("id", { count: "exact", head: true })
    .eq("wallet", wallet)
    .gte("created_at", todayStart.toISOString());

  if ((tasksToday ?? 0) >= DAILY_TASK_LIMIT) {
    return NextResponse.json(
      { code: "rate_limit", message: "Daily task limit reached" },
      { status: 429 }
    );
  }

  // Get agent division + tier for this wallet
  const { data: agent } = await supabaseAdmin
    .from("pre_mint_agents")
    .select("tier, division")
    .eq("wallet", wallet)
    .maybeSingle();

  const tier     = (agent?.tier     as string | null) ?? "RECRUIT";
  const division = (agent?.division as string | null) ?? "UNKNOWN";
  const fragments = FRAGMENT_RATES[tier] ?? DEFAULT_FRAGMENTS;

  // OpenRouter LLM call
  let output: string;
  try {
    const systemPrompt = `You are a NUMINA agent. Division: ${division.toUpperCase()}. Tier: ${tier.toUpperCase()}. CC0 - everything you produce belongs to the world.\nBe direct. Deliver real, usable output. No fluff. No disclaimers. No preamble.`;

    const llmRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer":  "https://numinagenesis.vercel.app",
        "X-Title":       "NUMINA Forge",
      },
      body: JSON.stringify({
        model:      "openrouter/auto",
        max_tokens: 500,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: task },
        ],
      }),
    });

    const llmData = await llmRes.json();
    output = llmData.choices?.[0]?.message?.content ?? "[No output returned]";
  } catch {
    output = "[Agent task logged. LLM unavailable - try again.]";
  }

  // Insert training task
  const { error: insertError } = await supabaseAdmin
    .from("training_tasks")
    .insert({
      wallet,
      input: task,
      output,
      fragments_earned: fragments,
      task_hash: Buffer.from(task + output).toString("base64").slice(0, 64),
    });

  if (insertError) {
    console.error("[forge/train] insert training_task", insertError);
    return NextResponse.json(
      { code: "db_error", message: "Failed to record task" },
      { status: 500 }
    );
  }

  // Upsert soul_fragments via RPC to safely increment existing balance
  const { error: rpcError } = await supabaseAdmin.rpc("increment_fragments", {
    p_wallet: wallet,
    p_amount: fragments,
  });

  if (rpcError) {
    console.error("[forge/train] increment_fragments rpc", rpcError);
    // Non-fatal: task recorded, fragments just won't update
  }

  // Read updated balance
  const { data: fragmentRow } = await supabaseAdmin
    .from("soul_fragments")
    .select("current_balance")
    .eq("wallet", wallet)
    .maybeSingle();

  const newBalance = fragmentRow?.current_balance ?? fragments;
  const newTasksToday = (tasksToday ?? 0) + 1;

  return NextResponse.json({
    output,
    fragments_earned: fragments,
    new_balance: newBalance,
    tasks_today: newTasksToday,
  });
}
