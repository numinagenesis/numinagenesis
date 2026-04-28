import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST /api/admin/unbind-wallet
 * Body: { walletAddress: string }
 *
 * Admin-only: clears the X account binding (bound_x_id, bound_x_handle, bound_at)
 * from the specified wallet, allowing the user to re-bind a different account.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  let walletAddress: string;
  try {
    const body = await req.json();
    walletAddress = String(body?.walletAddress ?? "").trim().toLowerCase();
    if (!walletAddress) throw new Error("empty");
  } catch {
    return NextResponse.json({ error: "walletAddress is required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("wallets")
    .update({
      bound_x_id: null,
      bound_x_handle: null,
      bound_at: null,
    })
    .eq("address", walletAddress);

  if (error) {
    console.error("[admin/unbind-wallet] update error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, walletAddress });
}
