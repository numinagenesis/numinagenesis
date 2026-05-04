import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ── GET /api/raffle — admin only ──────────────────────────────────────────────
// ?action=status   → eligible count, entry count, last winner
// ?action=populate → insert all eligible wallets into raffle_entries
// ?action=draw     → pick a random unwon entry and mark it won

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ code: "unauthorized" }, { status: auth.status });
  }

  const action = new URL(req.url).searchParams.get("action") ?? "status";

  if (action === "status") return handleStatus();
  if (action === "populate") return handlePopulate();
  if (action === "draw") return handleDraw();

  return NextResponse.json(
    { code: "invalid_action", message: "action must be status | populate | draw" },
    { status: 400 }
  );
}

// ── status ────────────────────────────────────────────────────────────────────

async function handleStatus() {
  const [eligibleResult, entryResult, winnerResult] = await Promise.all([
    // Wallets with at least 1 training task, not yet won
    supabaseAdmin
      .from("training_tasks")
      .select("wallet", { count: "exact", head: false })
      .then(async ({ data }) => {
        if (!data) return 0;
        const seen = new Set<string>();
        (data as { wallet: string }[]).forEach((r) => seen.add(r.wallet));
        const wallets = Array.from(seen);
        const { data: wonRows } = await supabaseAdmin
          .from("raffle_entries")
          .select("wallet")
          .eq("won", true);
        const wonSet = new Set<string>();
        (wonRows ?? []).forEach((r: { wallet: string }) => wonSet.add(r.wallet));
        return wallets.filter((w) => !wonSet.has(w)).length;
      }),

    // Total entries in raffle_entries
    supabaseAdmin
      .from("raffle_entries")
      .select("id", { count: "exact", head: true }),

    // Last winner
    supabaseAdmin
      .from("raffle_entries")
      .select("wallet, created_at")
      .eq("won", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    eligible_count: typeof eligibleResult === "number" ? eligibleResult : 0,
    entry_count: entryResult.count ?? 0,
    last_winner: winnerResult.data?.wallet ?? null,
  });
}

// ── populate ──────────────────────────────────────────────────────────────────

async function handlePopulate() {
  // Get all distinct wallets from training_tasks
  const { data: taskRows, error: taskError } = await supabaseAdmin
    .from("training_tasks")
    .select("wallet");

  if (taskError) {
    console.error("[raffle populate] training_tasks fetch", taskError);
    return NextResponse.json({ code: "db_error", message: "Failed to fetch training tasks" }, { status: 500 });
  }

  const walletSet = new Set<string>();
  (taskRows ?? []).forEach((r: { wallet: string }) => walletSet.add(r.wallet));
  const allWallets = Array.from(walletSet);

  if (allWallets.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, message: "No eligible wallets found" });
  }

  // Find wallets already in raffle_entries (regardless of won status — don't double-add)
  const { data: existingRows } = await supabaseAdmin
    .from("raffle_entries")
    .select("wallet");

  const existingSet = new Set<string>();
  (existingRows ?? []).forEach((r: { wallet: string }) => existingSet.add(r.wallet));
  const toInsert = allWallets.filter((w) => !existingSet.has(w));

  if (toInsert.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, message: "All eligible wallets already in raffle" });
  }

  const rows = toInsert.map((wallet) => ({ wallet, tickets: 1, won: false }));
  const { error: insertError } = await supabaseAdmin.from("raffle_entries").insert(rows);

  if (insertError) {
    console.error("[raffle populate] insert", insertError);
    return NextResponse.json({ code: "db_error", message: "Failed to insert entries" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: toInsert.length });
}

// ── draw ──────────────────────────────────────────────────────────────────────

async function handleDraw() {
  // Fetch all unwon entries
  const { data: entries, error: fetchError } = await supabaseAdmin
    .from("raffle_entries")
    .select("id, wallet")
    .eq("won", false);

  if (fetchError) {
    console.error("[raffle draw] fetch entries", fetchError);
    return NextResponse.json({ code: "db_error", message: "Failed to fetch entries" }, { status: 500 });
  }

  if (!entries || entries.length === 0) {
    return NextResponse.json(
      { code: "no_entries", message: "No unwon entries remaining" },
      { status: 400 }
    );
  }

  // Pick a random entry (Date.now() seeded — good enough for pre-mint raffle)
  const idx = Math.floor(Math.random() * entries.length);
  const winner = entries[idx] as { id: string; wallet: string };

  const { error: updateError } = await supabaseAdmin
    .from("raffle_entries")
    .update({ won: true })
    .eq("id", winner.id);

  if (updateError) {
    console.error("[raffle draw] update winner", updateError);
    return NextResponse.json({ code: "db_error", message: "Failed to mark winner" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, winner_wallet: winner.wallet });
}
