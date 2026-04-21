import { NextRequest, NextResponse } from "next/server";
import { DIVISIONS, type DivisionKey } from "@/lib/divisions";

// In production, replace with Vercel KV / Supabase / etc.
// For now: store in-memory (resets on cold start) and return success.
const inMemory: unknown[] = [];

export async function POST(req: NextRequest) {
  const { division, personaName, soul, handle } = await req.json();

  if (!division || !personaName || !soul) {
    return NextResponse.json(
      { error: "division, personaName, and soul are required." },
      { status: 400 }
    );
  }

  if (!DIVISIONS[division as DivisionKey]) {
    return NextResponse.json({ error: `Unknown division: ${division}` }, { status: 400 });
  }

  if (soul.length > 2000) {
    return NextResponse.json({ error: "Soul text too long (max 2000 chars)." }, { status: 400 });
  }

  const submission = {
    id:          `sub_${Date.now()}`,
    division,
    personaName: personaName.slice(0, 64),
    handle:      handle?.slice(0, 32) ?? "",
    createdAt:   new Date().toISOString(),
  };

  inMemory.push(submission);

  return NextResponse.json({ success: true, submissionId: submission.id });
}
