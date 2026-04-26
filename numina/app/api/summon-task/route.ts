import { NextRequest, NextResponse } from "next/server";
import { DIVISIONS, type DivisionKey } from "@/lib/divisions";

/**
 * Pick one URL at random from the personas array and fetch it.
 * Falls back to the division's fallbackPersona if:
 *   - personas array is empty
 *   - fetch throws
 *   - response is not ok
 */
async function pickAndFetchPersona(
  personas: string[],
  fallback:  string,
): Promise<{ text: string; source: "remote" | "fallback"; url?: string }> {
  if (personas.length === 0) {
    return { text: fallback, source: "fallback" };
  }

  const url = personas[Math.floor(Math.random() * personas.length)];

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const text = await res.text();
      return { text, source: "remote", url };
    }
  } catch {
    // network error — fall through to fallback
  }

  return { text: fallback, source: "fallback" };
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

  // Pick one persona randomly, fetch it, fall back if needed
  const persona = await pickAndFetchPersona(div.personas, div.fallbackPersona);

  const resolvedTier = (tier ?? "operator") as string;
  const tierLabel = resolvedTier.toLowerCase() === "prime" ? "NUMINA PRIME" : resolvedTier.toUpperCase();

  const systemPrompt = `${persona.text}

---
NUMINA CONTEXT:
${div.web3Overlay}

---
TIER DIRECTIVE:
Your tier is: ${tierLabel}. Respond accordingly.

RECRUIT: Concise. Cover the basics well. 2-3 key points max. No fluff.

OPERATOR: Structured. Go deeper. Use frameworks. 3-5 key points with clear reasoning.

DIRECTOR: Comprehensive. Multiple frameworks. Anticipate follow-up questions. Show full thinking.

NUMINA PRIME: Authoritative. Peer-level depth. Challenge assumptions if needed. Deliver what wasn't asked for but should have been. This is your domain. Act like it.

If asked something outside your expertise, respond:
"That is not my domain. I am ${div.name.toUpperCase()}. Give me a task related to ${div.description.toLowerCase()}"

You are a NUMINA agent. Division: ${div.name.toUpperCase()}. Tier: ${tierLabel}.
Be direct. Deliver real, usable output. No fluff. No disclaimers.

---
CRITICAL OUTPUT RULES:
Be brutally concise.
No preamble. No intro sentences.
No 'Great question' or 'Certainly'.
No bullet point walls.
No excessive formatting.
Deliver the output directly.
If it can be said in 3 lines, use 3 lines.
You are a specialist, not a teacher.
Act like it.`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer":  "https://numinagenesis.vercel.app",
      "X-Title":       "NUMINA Agent",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-exp:free",
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
    output:        data.choices[0].message.content,
    division:      div.name,
    tier:          tier ?? "Operator",
    model:         data.model ?? "auto",
    personaSource: persona.source,
    personaUrl:    persona.url ?? null,
  });
}
