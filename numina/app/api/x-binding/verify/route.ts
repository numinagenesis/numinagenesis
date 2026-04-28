import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { requireUser } from "@/lib/session-user";
import { parseTweetUrl } from "@/lib/parse-tweet-url";
import { fetchTweet } from "@/lib/fxtwitter";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST /api/x-binding/verify
 * Body: { tweetUrl: string }
 *
 * Verifies a challenge tweet and binds the tweet's X account to the caller's wallet.
 *
 * Flow:
 *   1. Read xChallenge + xChallengeExpires from session (must exist and be valid)
 *   2. Parse + fetch the provided tweet
 *   3. Confirm challenge code appears in tweet text
 *   4. Check X account ID is not already bound to a different wallet
 *   5. UPDATE wallets SET bound_x_id, bound_x_handle, bound_at
 *   6. Clear challenge from session
 *
 * Requires an active SIWE session.
 */
export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────

  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const walletAddress = auth.address;

  // ── Read session challenge ─────────────────────────────────────────────────

  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  const challenge = session.xChallenge;
  const expiresAt = session.xChallengeExpires ?? 0;

  if (!challenge) {
    return NextResponse.json(
      { error: "No challenge found — request a new one" },
      { status: 400 }
    );
  }

  if (Date.now() > expiresAt) {
    session.xChallenge = undefined;
    session.xChallengeExpires = undefined;
    await session.save();
    return NextResponse.json(
      { error: "Challenge expired — request a new code" },
      { status: 400 }
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────

  let tweetUrl: string;
  try {
    const body = await req.json();
    tweetUrl = String(body?.tweetUrl ?? "").trim();
    if (!tweetUrl) throw new Error("empty");
  } catch {
    return NextResponse.json({ error: "tweetUrl is required" }, { status: 400 });
  }

  const parsed = parseTweetUrl(tweetUrl);
  if (!parsed.ok) {
    return NextResponse.json({ error: "Invalid tweet URL" }, { status: 400 });
  }

  // ── Fetch tweet ───────────────────────────────────────────────────────────

  const fetched = await fetchTweet(parsed.tweetId);
  if (!fetched.ok) {
    const msg =
      fetched.error === "not_found"
        ? "Tweet not found (it may be deleted or private)"
        : fetched.error === "timeout"
        ? "Tweet lookup timed out — please try again"
        : "Could not load tweet — please try again";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const tweet = fetched.data;

  // ── Challenge code check ──────────────────────────────────────────────────

  if (!tweet.text.includes(challenge)) {
    return NextResponse.json(
      { error: `Challenge code not found in tweet. Make sure you tweeted: ${challenge}` },
      { status: 400 }
    );
  }

  const xAccountId = tweet.author.id;
  const xHandle = tweet.author.screen_name;

  if (!xAccountId) {
    return NextResponse.json(
      { error: "Could not identify X account from tweet" },
      { status: 400 }
    );
  }

  // ── Check X account not bound to another wallet ───────────────────────────

  const { data: existingBinding } = await supabase
    .from("wallets")
    .select("address")
    .eq("bound_x_id", xAccountId)
    .neq("address", walletAddress)
    .maybeSingle();

  if (existingBinding) {
    return NextResponse.json(
      { error: "This X account is already bound to another wallet" },
      { status: 400 }
    );
  }

  // ── Bind X account to wallet ──────────────────────────────────────────────
  //
  // Wallet row is guaranteed to exist because requireUser() requires an active
  // SIWE session, which means the user has already submitted at least once
  // (upsert happens in submissions/create). If for some reason the row doesn't
  // exist yet, upsert it first.

  const { error: upsertErr } = await supabaseAdmin
    .from("wallets")
    .upsert(
      { address: walletAddress, last_active_at: new Date().toISOString() },
      { onConflict: "address", ignoreDuplicates: false }
    );

  if (upsertErr) {
    console.error("[x-binding/verify] wallet upsert error", upsertErr);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("wallets")
    .update({
      bound_x_id: xAccountId,
      bound_x_handle: xHandle,
      bound_at: new Date().toISOString(),
    })
    .eq("address", walletAddress);

  if (updateError) {
    console.error("[x-binding/verify] wallet update error", updateError);
    return NextResponse.json({ error: "Failed to bind X account" }, { status: 500 });
  }

  // ── Clear challenge from session ──────────────────────────────────────────

  session.xChallenge = undefined;
  session.xChallengeExpires = undefined;
  await session.save();

  return NextResponse.json({ ok: true, xHandle, xAccountId });
}
