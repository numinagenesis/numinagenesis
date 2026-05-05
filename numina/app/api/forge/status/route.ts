import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session-user";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ── GET /api/forge/status ─────────────────────────────────────────────────────

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }
  const wallet = auth.address.toLowerCase();

  // Agent
  const { data: agent } = await supabaseAdmin
    .from("pre_mint_agents")
    .select("*")
    .eq("wallet", wallet)
    .maybeSingle();

  // Fragment balance
  const { data: fragmentRow } = await supabaseAdmin
    .from("soul_fragments")
    .select("current_balance")
    .eq("wallet", wallet)
    .maybeSingle();

  // Tasks today
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count: tasksToday } = await supabaseAdmin
    .from("training_tasks")
    .select("id", { count: "exact", head: true })
    .eq("wallet", wallet)
    .gte("created_at", todayStart.toISOString());

  return NextResponse.json({
    agent: agent ?? null,
    fragments: fragmentRow?.current_balance ?? 0,
    tasks_today: tasksToday ?? 0,
  });
}
