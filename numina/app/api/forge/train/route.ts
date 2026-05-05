import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session-user";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { FRAGMENT_RATES } from "@/lib/fragment-rates";

const DEFAULT_FRAGMENTS = 10;

// Max tasks per wallet per day
const DAILY_TASK_LIMIT = 10;

// ÔöÇÔöÇ POST /api/forge/train ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }
  const wallet = auth.address;

  let task: string;
  try {
    const body = await req.json();
    task = typeof body.task === "string" ? body.task.trim() : "";
  } catch {
    return NextResponse.json({ code: "invalid_body" }, { status: 400 });
  }

  if (!task) {
    return NextResponse.json(
      { code: "invalid_task", message: "Task description is required" },
      { status: 400 }
    );
  }

  // Rate limit ÔÇö count today's tasks
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

  // Get agent tier for this wallet
  const { data: agent } = await supabaseAdmin
    .from("pre_mint_agents")
    .select("tier")
    .eq("wallet", wallet)
    .maybeSingle();

  const tier = (agent?.tier as string | null) ?? "RECRUIT";
  const fragments = FRAGMENT_RATES[tier] ?? DEFAULT_FRAGMENTS;

  // Generate task output (placeholder ÔÇö replace with LLM call if needed)
  const output = `[AGENT TASK LOG]\nWallet: ${wallet.slice(0, 8)}...\nTier: ${tier}\nTask: ${task}\n\nProcessing complete. Neural pathways updated. Fragment yield nominal.`;

  // Insert training task
  const { error: insertError } = await supabaseAdmin
    .from("training_tasks")
    .insert({
      wallet,
      task,
      output,
      fragments_earned: fragments,
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
