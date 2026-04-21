import { NextRequest, NextResponse } from "next/server";

const PERSONAS: Record<string, string> = {
  frontend_wizard: "Expert React/UI developer. Deliver working code.",
  research_agent: "Deep researcher. Deliver structured findings with sources.",
  solidity_auditor: "Smart contract security expert. Identify vulnerabilities.",
};

export async function POST(req: NextRequest) {
  const { agentRole, task } = await req.json();

  if (!agentRole || !task) {
    return NextResponse.json({ error: "Missing agentRole or task" }, { status: 400 });
  }

  const persona = PERSONAS[agentRole];
  if (!persona) {
    return NextResponse.json({ error: `Unknown agentRole: ${agentRole}` }, { status: 400 });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not set" }, { status: 500 });
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "http://localhost",
      "X-Title": "Agent NFT",
    },
    body: JSON.stringify({
      model: "openrouter/auto",
      messages: [
        {
          role: "system",
          content: `You are a ${agentRole} specialist. ${persona} Be direct and deliver real output.`,
        },
        { role: "user", content: task },
      ],
    }),
  });

  const data = await res.json();

  if (!data.choices || !data.choices[0]) {
    return NextResponse.json(
      { error: `OpenRouter returned no choices: ${JSON.stringify(data)}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ result: data.choices[0].message.content });
}
