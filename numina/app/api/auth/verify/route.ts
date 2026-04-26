import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SiweMessage } from "siwe";
import { sessionOptions, type SessionData } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { message, signature } = await req.json();
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  const siwe = new SiweMessage(message);
  const { success, data, error } = await siwe.verify({
    signature,
    nonce: session.nonce,
    domain: req.headers.get("host") ?? undefined,
  });

  if (!success) {
    return NextResponse.json(
      { error: error?.type ?? "Verification failed" },
      { status: 422 }
    );
  }

  session.address = data.address.toLowerCase();
  session.nonce = undefined;
  session.expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  await session.save();

  return NextResponse.json({ ok: true, address: session.address });
}
