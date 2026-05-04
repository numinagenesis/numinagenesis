import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ── POST /api/admin/collab — approve or reject a collab request ───────────────

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ code: "unauthorized" }, { status: auth.status });
  }

  let body: { action?: string; id?: string; spots_allocated?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: "invalid_body" }, { status: 400 });
  }

  const { action, id, spots_allocated } = body;

  if (!id) {
    return NextResponse.json({ code: "missing_id", message: "id is required" }, { status: 400 });
  }

  if (action === "approve") {
    const spots = Math.min(Math.max(1, Math.floor(spots_allocated ?? 1)), 50);

    const { error } = await supabaseAdmin
      .from("collab_requests")
      .update({
        status: "approved",
        spots_allocated: spots,
        reviewed_by: auth.address,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[admin/collab approve]", error);
      return NextResponse.json({ code: "db_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, action: "approved", spots });
  }

  if (action === "reject") {
    const { error } = await supabaseAdmin
      .from("collab_requests")
      .update({
        status: "rejected",
        reviewed_by: auth.address,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[admin/collab reject]", error);
      return NextResponse.json({ code: "db_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, action: "rejected" });
  }

  return NextResponse.json(
    { code: "invalid_action", message: "action must be approve or reject" },
    { status: 400 }
  );
}
