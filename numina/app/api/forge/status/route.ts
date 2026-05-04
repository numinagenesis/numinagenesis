import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session-user";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const wallet = auth.address;

  const [{ data: agent }, { data: fragRow }] = await Promise.all([
    supabaseAdmin
      .from("pre_mint_agents")
      .select("*")
      .eq("wallet", wallet)
      .eq("is_active", true)
      .maybeSingle(),
    supabaseAdmin
      .from("soul_fragments")
      .select("balance")
      .eq("wallet", wallet)
      .maybeSingle(),
  ]);

  if (!agent) {
    return NextResponse.json({ agent: null, fragments: 0 });
  }

  return NextResponse.json({ agent, fragments: fragRow?.balance ?? 0 });
}
