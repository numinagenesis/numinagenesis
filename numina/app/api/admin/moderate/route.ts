import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST /api/admin/moderate
 * Body: { id: string, action: "approve" | "reject", reason?: string }
 *
 * Admin-only. Approves or rejects a submission that is currently pending.
 *
 * Approve:
 *   - Sets submission.status = "approved", verified_at = now()
 *   - Increments wallets.total_points by submission.points_awarded
 *   - Updates wallets.last_active_at = now()
 *
 * Reject:
 *   - Sets submission.status = "rejected", rejection_note = reason, verified_at = now()
 *   - Does NOT touch wallet points (they were never awarded)
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  // ── Parse body ────────────────────────────────────────────────────────────

  let id: string, action: string, reason: string | undefined;
  try {
    const body = await req.json();
    id     = String(body?.id ?? "").trim();
    action = String(body?.action ?? "").trim();
    reason = body?.reason ? String(body.reason).trim() : undefined;
    if (!id || !action) throw new Error("missing fields");
  } catch {
    return NextResponse.json({ error: "id and action are required" }, { status: 400 });
  }

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  if (action === "reject" && !reason) {
    return NextResponse.json({ error: "reason is required when rejecting" }, { status: 400 });
  }

  // ── Fetch submission ──────────────────────────────────────────────────────

  const { data: submission, error: fetchError } = await supabaseAdmin
    .from("submissions")
    .select("id, status, points_awarded, wallet_address")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("[admin/moderate] fetch error", fetchError);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (submission.status !== "pending") {
    return NextResponse.json(
      { error: `Submission is already ${submission.status}` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  // ── Execute action ────────────────────────────────────────────────────────

  if (action === "approve") {
    // 1. Mark submission approved
    const { error: subErr } = await supabaseAdmin
      .from("submissions")
      .update({ status: "approved", verified_at: now })
      .eq("id", id);

    if (subErr) {
      console.error("[admin/moderate] approve submission error", subErr);
      return NextResponse.json({ error: "Failed to update submission" }, { status: 500 });
    }

    // 2. Increment wallet points
    const { data: walletRow, error: walletReadErr } = await supabaseAdmin
      .from("wallets")
      .select("total_points")
      .eq("address", submission.wallet_address)
      .maybeSingle();

    if (walletReadErr) {
      // Submission approved — log points failure but don't 500
      console.error("[admin/moderate] wallet read error (points not incremented)", walletReadErr);
    } else {
      const newTotal = (walletRow?.total_points ?? 0) + (submission.points_awarded ?? 0);
      const { error: walletUpdateErr } = await supabaseAdmin
        .from("wallets")
        .update({ total_points: newTotal, last_active_at: now })
        .eq("address", submission.wallet_address);

      if (walletUpdateErr) {
        console.error("[admin/moderate] wallet points update error", walletUpdateErr);
      }
    }
  } else {
    // Reject — update status + rejection_note, leave wallet points untouched
    const { error: subErr } = await supabaseAdmin
      .from("submissions")
      .update({
        status: "rejected",
        rejection_note: reason,
        verified_at: now,
      })
      .eq("id", id);

    if (subErr) {
      console.error("[admin/moderate] reject submission error", subErr);
      return NextResponse.json({ error: "Failed to update submission" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, action, id });
}
