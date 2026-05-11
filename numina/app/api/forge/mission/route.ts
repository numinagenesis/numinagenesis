import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session-user";
import { supabaseAdmin } from "@/lib/supabase-admin";

function llmConfig() {
  if (process.env.GROQ_API_KEY) {
    return { url: "https://api.groq.com/openai/v1/chat/completions", key: process.env.GROQ_API_KEY, model: "llama-3.1-8b-instant" };
  }
  return { url: "https://openrouter.ai/api/v1/chat/completions", key: process.env.OPENROUTER_API_KEY ?? "", model: "openrouter/auto" };
}

const MISSION_PROMPTS: Record<string, string> = {
  strategy:    "Generate one specific strategic analysis mission for a Web3 project. One sentence. Actionable. Real. No preamble.",
  security:    "Generate one smart contract security review mission. One sentence. Specific.",
  research:    "Generate one DeFi/NFT research mission. One sentence. Current and relevant.",
  analytics:   "Generate one on-chain data analysis mission. One sentence. Specific metric.",
  engineering: "Generate one technical architecture mission. One sentence. Specific system.",
  product:     "Generate one product strategy mission. One sentence. Specific problem.",
  design:      "Generate one design critique mission. One sentence. Specific.",
  community:   "Generate one community growth mission. One sentence. Specific campaign.",
  collab:      "Generate one partnership mission. One sentence. Specific deal.",
  growth:      "Generate one growth hacking mission. One sentence. Specific channel.",
  brand:       "Generate one content mission. One sentence. Specific message.",
  alpha:       "Generate one intelligence gathering mission. One sentence. Specific target.",
};

const FALLBACK_MISSIONS: Record<string, string> = {
  strategy:    "Identify the three biggest competitive moat vulnerabilities facing a mid-size DeFi protocol entering a market dominated by two incumbents.",
  security:    "Review a staking contract for reentrancy vectors in the withdrawal flow and propose a mitigation pattern.",
  research:    "Analyze the tokenomic structure of a new L2 incentive program and identify sustainability risks within the first 90 days.",
  analytics:   "Map wallet cohort retention for a protocol's first 30 days post-launch using on-chain deposit/withdrawal frequency.",
  engineering: "Design the smart contract architecture for a cross-chain NFT mint that enforces supply caps on each chain independently.",
  product:     "Define the minimum viable onboarding flow that gets a new wallet from zero to first transaction in under 60 seconds.",
  design:      "Critique the information hierarchy of a DEX swap interface and identify the three highest-friction decision points.",
  community:   "Plan a 2-week activation campaign to convert lurkers in a 5,000-member Discord into active governance participants.",
  collab:      "Structure a co-marketing proposal between a lending protocol and an NFT platform that creates mutual TVL incentives.",
  growth:      "Design a referral mechanic for a new perp DEX that aligns trader incentives with protocol fee revenue.",
  brand:       "Write the core positioning statement for a ZK-rollup targeting developers who've been burned by EVM compatibility gaps.",
  alpha:       "Identify on-chain signals that precede a major liquidity migration between two competing yield aggregators.",
};

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }
  const wallet = auth.address;

  const { data: agent } = await supabaseAdmin
    .from("pre_mint_agents")
    .select("division")
    .eq("wallet", wallet)
    .maybeSingle();

  const division = (agent?.division as string | null) ?? "strategy";
  const prompt   = MISSION_PROMPTS[division] ?? MISSION_PROMPTS.strategy;

  let mission: string;
  try {
    const { url, key, model } = llmConfig();
    const llmRes = await fetch(url, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 60,
        messages: [
          {
            role:    "system",
            content: "You generate one-sentence mission questions for AI agents. Be direct and specific. One sentence only — a sharp, concrete question the agent must answer. No quotes, no preamble, no labels, no bullet points.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (llmRes.status === 429) {
      return NextResponse.json(
        { code: "rate_limited", error: "Agent is busy. Try again in 30 seconds." },
        { status: 429 }
      );
    }

    const llmData = await llmRes.json();
    const raw = llmData.choices?.[0]?.message?.content?.trim() ?? "";
    mission = raw || (FALLBACK_MISSIONS[division] ?? FALLBACK_MISSIONS.strategy);
  } catch {
    mission = FALLBACK_MISSIONS[division] ?? FALLBACK_MISSIONS.strategy;
  }

  return NextResponse.json({ mission });
}
