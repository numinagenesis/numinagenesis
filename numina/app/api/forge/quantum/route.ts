import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config-cache";

type QuantumEvent = {
  active:     boolean;
  multiplier: number;
  expires_at: string | null;
};

const DEFAULTS: QuantumEvent = { active: false, multiplier: 2, expires_at: null };

export async function GET() {
  let qe: QuantumEvent = DEFAULTS;
  try {
    qe = await getConfig<QuantumEvent>("quantum_event");
  } catch {
    // not seeded yet — return defaults
  }

  const now = Date.now();
  const expiresMs = qe.expires_at ? new Date(qe.expires_at).getTime() : null;
  const effectivelyActive = qe.active && expiresMs !== null && expiresMs > now;
  const time_remaining_seconds = effectivelyActive && expiresMs
    ? Math.max(0, Math.floor((expiresMs - now) / 1000))
    : 0;

  return NextResponse.json(
    {
      active:                effectivelyActive,
      multiplier:            qe.multiplier,
      expires_at:            qe.expires_at,
      time_remaining_seconds,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma":        "no-cache",
      },
    }
  );
}
