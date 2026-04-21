import { NextRequest, NextResponse } from "next/server";
import { DIVISIONS, type DivisionKey } from "@/lib/divisions";

async function fetchPersona(url: string, fallback: string): Promise<string> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (res.ok) return await res.text();
  } catch {}
  return fallback;
}

export async function POST(req: NextRequest) {
  const { division, tier, task } = await req.json();

  if (!division || !task) {
    return NextResponse.json({ error: "Missing division or task." }, { status: 400 });
  }

  const div = DIVISIONS[division as DivisionKey];
  if (!div) {
    return NextResponse.json({ error: `Unknown division: ${division}` }, { status: 400 });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured." }, { status: 500 });
  }

  const persona = await fetchPersona(div.personaUrl, div.fallbackPersona);

  const systemPrompt = `${persona}

---
You are a NUMINA agent. Division: ${div.name.toUpperCase()}. Tier: ${(tier ?? "Operator").toUpperCase()}.
CC0 — all output belongs to the world. Permanent. On-chain.
Be direct. Deliver real, usable output. No fluff. No disclaimers.`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer":  "https://numina.xyz",
      "X-Title":       "NUMINA Agent",
    },
    body: JSON.stringify({
      model: "openrouter/auto",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: task },
      ],
    }),
  });

  const data = await res.json();

  if (!data.choices?.[0]) {
    return NextResponse.json(
      { error: `OpenRouter error: ${JSON.stringify(data)}` },
      { status: 502 }
    );
  }

  return NextResponse.json({
    output:   data.choices[0].message.content,
    division: div.name,
    tier:     tier ?? "Operator",
    model:    data.model ?? "auto",
  });
}
