import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { requireUser } from "@/lib/session-user";

/**
 * POST /api/x-binding/challenge
 *
 * Generates an 8-char hex challenge code (prefixed "NUMINA-XB-"),
 * stores it in the iron-session with a 10-minute TTL, and returns
 * instructions for the user to tweet the code.
 *
 * Requires an active SIWE session.
 */
export async function POST() {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Generate code: "NUMINA-XB-" + 8 uppercase hex chars
  const code = "NUMINA-XB-" + randomBytes(4).toString("hex").toUpperCase();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

  // Persist in session
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  session.xChallenge = code;
  session.xChallengeExpires = expiresAt;
  await session.save();

  return NextResponse.json({
    challenge: code,
    expiresAt,
    instructions: `Tweet the code below from your X account, then paste the tweet URL to verify.`,
  });
}
