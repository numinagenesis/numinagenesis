import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session-user";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const wallet = auth.address;

  const { data: tasks, error } = await supabaseAdmin
    .from("training_tasks")
    .select("id, input, output, fragments_earned, task_hash, created_at")
    .eq("wallet", wallet)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[forge/history] query error", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }

  return NextResponse.json({ tasks: tasks ?? [] });
}
