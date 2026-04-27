import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/whoami
 * Safe to call from client — never exposes ADMIN_WALLET value.
 * Returns { isAdmin: boolean, address: string | null }
 */
export async function GET() {
  const [auth, session] = await Promise.all([
    requireAdmin(),
    getIronSession<SessionData>(cookies(), sessionOptions),
  ]);

  return NextResponse.json({
    isAdmin: auth.ok,
    address: session.address ?? null,
  });
}
