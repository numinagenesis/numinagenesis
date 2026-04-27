import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";

type AdminResult =
  | { ok: true; address: string }
  | { ok: false; status: 401 | 403 };

/**
 * Call at the top of every admin API route.
 * Returns ok:true only when the session belongs to ADMIN_WALLET.
 */
export async function requireAdmin(): Promise<AdminResult> {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  if (!session.address) {
    return { ok: false, status: 401 };
  }

  const adminWallet = process.env.ADMIN_WALLET;
  if (!adminWallet) {
    // Env var missing — fail closed
    return { ok: false, status: 403 };
  }

  if (session.address.toLowerCase() !== adminWallet.toLowerCase()) {
    return { ok: false, status: 403 };
  }

  return { ok: true, address: session.address };
}
