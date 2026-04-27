import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";

type UserResult =
  | { ok: true; address: string }
  | { ok: false; status: 401 };

/**
 * Call at the top of every user-facing API route.
 * Returns ok:true only when a valid SIWE session exists.
 * Address is always lowercase.
 */
export async function requireUser(): Promise<UserResult> {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.address) return { ok: false, status: 401 };
  return { ok: true, address: session.address.toLowerCase() };
}
