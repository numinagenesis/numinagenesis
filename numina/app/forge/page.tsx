"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AgentCard from "@/components/AgentCard";
import { DIVISIONS, TIERS, type DivisionKey, type TierKey } from "@/lib/divisions";
import { WL_THRESHOLD, type PreMintAgent } from "@/lib/supabase-forge";

// ── Helpers ───────────────────────────────────────────────────────────────────

function tierToRarity(tier: string): "legendary" | "rare" | "uncommon" | "classified" {
  if (tier === "prime") return "legendary";
  if (tier === "director") return "rare";
  if (tier === "operator") return "uncommon";
  return "classified";
}

// ── Fragment Meter ────────────────────────────────────────────────────────────

function FragmentMeter({ balance }: { balance: number }) {
  const pct = Math.min((balance / WL_THRESHOLD) * 100, 100);
  const toWL = Math.max(WL_THRESHOLD - balance, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <span className="pixel text-[7px] text-dim">SOUL FRAGMENTS</span>
        <span className="mono text-[11px] text-primary">{balance} / {WL_THRESHOLD}</span>
      </div>
      <div style={{ background: "#0A0A0A", height: 4, border: "1px solid #222222" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: pct >= 100 ? "#FFFFFF" : "#666666",
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <div className="flex justify-between">
        <span className="mono text-[10px] text-dim">
          {balance} fragment{balance !== 1 ? "s" : ""}
        </span>
        <span className="mono text-[10px]" style={{ color: toWL === 0 ? "#FFFFFF" : "#666666" }}>
          {toWL === 0 ? "WL GUARANTEED" : `${toWL} to guaranteed WL`}
        </span>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type LoadState = "checking" | "ready";

export default function ForgePage() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>("checking");
  const [agent, setAgent] = useState<PreMintAgent | null>(null);
  const [fragments, setFragments] = useState(0);
  const [summoning, setSummoning] = useState(false);
  const [summonError, setSummonError] = useState("");

  // Check session; redirect to / if not signed in
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.address) {
          router.push("/");
          return;
        }
        return fetchStatus();
      })
      .catch(() => router.push("/"));
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/forge/status");
      if (res.ok) {
        const data = await res.json();
        setAgent(data.agent ?? null);
        setFragments(data.fragments ?? 0);
      }
    } finally {
      setLoadState("ready");
    }
  }, []);

  async function summonAgent() {
    setSummoning(true);
    setSummonError("");
    try {
      const res = await fetch("/api/forge/summon", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSummonError(data.error ?? "Summon failed");
        return;
      }
      setAgent(data.agent);
      setFragments(data.fragments ?? 0);
    } catch {
      setSummonError("Network error — try again");
    } finally {
      setSummoning(false);
    }
  }

  // ── Loading ──
  if (loadState === "checking") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="pixel text-[7px] text-dim">
          CONNECTING<span className="blink">...</span>
        </p>
      </main>
    );
  }

  const div  = agent ? DIVISIONS[agent.division as DivisionKey] : null;
  const tier = agent ? TIERS[agent.tier as TierKey] : null;

  // ── No agent yet ──
  if (!agent) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="flex flex-col items-center gap-8 max-w-md w-full">
          <div className="scanlines p-6" style={{ background: "#080808", border: "1px solid #222222" }}>
            <div className="glitch-fast" style={{ fontSize: 72, color: "#FFFFFF", lineHeight: 1 }}>◈</div>
          </div>

          <div>
            <p className="pixel text-[7px] text-dim mb-3">// THE FORGE</p>
            <h1 className="pixel text-primary glitch leading-loose" style={{ fontSize: "clamp(14px,3vw,22px)" }}>
              COLLAPSE YOUR<br />AGENT
            </h1>
          </div>

          <p className="mono text-sm text-muted leading-relaxed">
            Your soul fragment awaits.<br />
            One per wallet. Permanent.
          </p>

          <button
            onClick={summonAgent}
            disabled={summoning}
            className="btn-amber pulse-amber w-full"
            style={{ fontSize: 11, padding: "16px 32px" }}
          >
            {summoning ? "COLLAPSING..." : "► SUMMON AGENT"}
          </button>

          {summonError && (
            <p className="mono text-xs" style={{ color: "#FFFFFF" }}>✗ {summonError}</p>
          )}

          <p className="mono text-[11px] text-dim">
            Earn soul fragments by completing tasks.<br />
            500 fragments = guaranteed WL.
          </p>
        </div>
      </main>
    );
  }

  // ── Has agent ──
  return (
    <main className="px-6 py-12 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-10">
        <hr className="chain-border flex-1" />
        <span className="pixel text-[9px] text-primary">THE FORGE</span>
        <hr className="chain-border flex-1" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

        {/* Left: Agent card */}
        <div className="fade-up">
          <AgentCard
            division={agent.division as DivisionKey}
            tier={agent.tier as TierKey}
            tokenId={agent.fragment_id}
            flavorText={div ? `${div.name.toUpperCase()}. COLLAPSED.` : "COLLAPSED."}
            rarity={tierToRarity(agent.tier)}
            revealed={true}
            fragmentId={agent.fragment_id}
            soulHash={agent.soul_hash}
          />
        </div>

        {/* Right: Fragment meter + actions */}
        <div className="fade-up flex flex-col gap-6">

          {/* Soul fragment status */}
          <div className="numina-card bracketed p-5 flex flex-col gap-5">
            <div>
              <p className="pixel text-[7px] text-dim mb-1">// SOUL FRAGMENT</p>
              {div && tier && (
                <p className="pixel text-[9px]" style={{ color: div.color }}>
                  {div.name.toUpperCase()} · {tier.name.toUpperCase()}
                </p>
              )}
            </div>

            <hr className="chain-border" />

            <FragmentMeter balance={fragments} />
          </div>

          {/* Agent metadata */}
          <div className="numina-card bracketed p-5 flex flex-col gap-2">
            <p className="pixel text-[7px] text-dim mb-2">// COLLAPSE DATA</p>
            {[
              ["FRAGMENT", agent.fragment_id],
              ["SOUL HASH", agent.soul_hash.slice(0, 16) + "..."],
              ["STATUS", "ACTIVE"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-0.5">
                <span className="mono text-[10px] text-dim shrink-0">{k}</span>
                <span className="mono text-[10px] text-primary text-right truncate">{v}</span>
              </div>
            ))}
          </div>

          {/* Deploy task — placeholder for F2 */}
          <button
            className="btn-outline w-full"
            disabled
            style={{ opacity: 0.4, cursor: "not-allowed" }}
          >
            ► DEPLOY TASK — COMING SOON
          </button>

        </div>
      </div>
    </main>
  );
}
