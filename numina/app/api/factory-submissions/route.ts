import { NextResponse } from "next/server";
import submissions from "@/data/submissions.json";

export async function GET() {
  // Return seeded submissions (newest first, name + division only)
  const safe = [...submissions]
    .reverse()
    .slice(0, 10)
    .map(({ id, personaName, division, handle, createdAt }) => ({
      id, personaName, division, handle: handle || null, createdAt,
    }));

  return NextResponse.json({ submissions: safe, total: submissions.length });
}
