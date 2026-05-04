"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AgentCard from "@/components/AgentCard";
import { DIVISIONS, TIERS, type DivisionKey, type TierKey } from "@/lib/divisions";
import { WL_THRESHOLD, type PreMintAgent } from "@/lib/supabase-forge";

const DAILY_LIMIT = 10;
const INPUT_MAX   = 200;

// ── Helpers ───────────────────────────────────────────────────────────────────

function tierToRarity(tier: string): "legendary" | "rare" | "uncommon" | "classified" {
  if (tier === "prime")    return "legendary";
  if (tier === "director") return "rare";
  if (tier === "operator") return "uncommon";
  return "classified";
}

// ── Fragment Meter ────────────────────────────────────────────────────────────

function FragmentMeter({ balance }: { balance: number }) {
  const pct  = Math.min((balance / WL_THRESHOLD) * 100, 100);
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

  // agent state
  const [loadState,    setLoadState]    = useState<LoadState>("checking");
  const [agent,        setAgent]        = useState<PreMintAgent | null>(null);
  const [fragments,    setFragments]    = useState(0);
  const [summoning,    setSummoning]    = useState(false);
  const [summonError,  setSummonError]  = useState("");

  // training state
  const [taskInput,          setTaskInput]          = useState("");
  const [running,            setRunning]            = useState(false);
  const [taskOutput,         setTaskOutput]         = useState("");
  const [trainError,         setTrainError]         = useState("");
  const [tasksToday,         setTasksToday]         = useState(0);
  const [lastFragsEarned,    setLastFragsEarned]    = useState<number | null>(null);

  // ── Session check + initial load ──────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/forge/status");
      if (res.ok) {
        const data = await res.json();
        setAgent(data.agent ?? null);
        setFragments(data.fragments ?? 0);
        setTasksToday(data.tasks_today ?? 0);
      }
    } finally {
      setLoadState("ready");
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.address) { router.push("/"); return; }
        fetchStatus();
      })
      .catch(() => router.push("/"));
  }, []);

  // ── Summon ────────────────────────────────────────────────────────────────
  async function summonAgent() {
    setSummoning(true);
    setSummonError("");
    try {
      const res  = await fetch("/api/forge/summon", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setSummonError(data.error ?? "Summon failed"); return; }
      setAgent(data.agent);
      setFragments(data.fragments ?? 0);
    } catch {
      setSummonError("Network error — try again");
    } finally {
      setSummoning(false);
    }
  }

  // ── Run task ──────────────────────────────────────────────────────────────
  async function runTask() {
    if (!taskInput.trim() || running || tasksToday >= DAILY_LIMIT) return;
    setRunning(true);
    setTrainError("");
    setLastFragsEarned(null);
    try {
      const res  = await fetch("/api/forge/train", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ input: taskInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setTrainError(data.error ?? "Task failed"); return; }
      setTaskOutput(data.output ?? "");
      setFragments(data.new_balance ?? fragments);
      setTasksToday(data.tasks_today ?? tasksToday + 1);
      setLastFragsEarned(data.fragments_earned ?? null);
    } catch {
      setTrainError("Network error — try again");
    } finally {
      setRunning(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loadState === "checking") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="pixel text-[7px] text-dim">CONNECTING<span className="blink">...</span></p>
      </main>
    );
  }

  const div  = agent ? DIVISIONS[agent.division as DivisionKey] : null;
  const tier = agent ? TIERS[agent.tier as TierKey]             : null;

  // ── No agent yet ──────────────────────────────────────────────────────────
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
            Your soul fragment awaits.<br />One per wallet. Permanent.
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
            Earn soul fragments by completing tasks.<br />500 fragments = guaranteed WL.
          </p>
        </div>
      </main>
    );
  }

  // ── Has agent ─────────────────────────────────────────────────────────────
  const atLimit = tasksToday >= DAILY_LIMIT;

  return (
    <main className="px-6 py-12 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-10">
        <hr className="chain-border flex-1" />
        <span className="pixel text-[9px] text-primary">THE FORGE</span>
        <hr className="chain-border flex-1" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

        {/* ── Left: Agent card ─────────────────────────────────────────── */}
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

        {/* ── Right: meter + task panel ─────────────────────────────────── */}
        <div className="fade-up flex flex-col gap-5">

          {/* Fragment meter */}
          <div className="numina-card bracketed p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="pixel text-[7px] text-dim mb-1">// SOUL FRAGMENT</p>
                {div && tier && (
                  <p className="pixel text-[9px]" style={{ color: div.color }}>
                    {div.name.toUpperCase()} · {tier.name.toUpperCase()}
                  </p>
                )}
              </div>
              {lastFragsEarned !== null && (
                <span
                  className="pixel text-[8px]"
                  style={{ color: "#FFFFFF", background: "#111111", border: "1px solid #333333", padding: "2px 6px" }}
                >
                  +{lastFragsEarned} SOUL FRAGMENTS
                </span>
              )}
            </div>
            <hr className="chain-border" />
            <FragmentMeter balance={fragments} />
          </div>

          {/* Task input */}
          <div className="numina-card bracketed p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="pixel text-[7px] text-dim">// DEPLOY TASK</p>
              <span
                className="mono text-[10px]"
                style={{ color: atLimit ? "#FFFFFF" : "#666666" }}
              >
                {tasksToday}/{DAILY_LIMIT} today
              </span>
            </div>

            {div && tier && (
              <p className="pixel text-[8px]" style={{ color: div.color }}>
                {div.name.toUpperCase()} · {tier.name.toUpperCase()}
              </p>
            )}

            <textarea
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value.slice(0, INPUT_MAX))}
              disabled={running || atLimit}
              rows={4}
              maxLength={INPUT_MAX}
              placeholder={
                atLimit
                  ? "Daily limit reached. Come back tomorrow."
                  : div
                  ? `What do you want your ${div.name} agent to do?`
                  : "Enter a task..."
              }
              className="w-full mono text-sm px-3 py-2 outline-none resize-none"
              style={{
                background: "#080808",
                border:     "1px solid #222222",
                color:      "#FFFFFF",
                opacity:    atLimit ? 0.4 : 1,
              }}
            />

            <div className="flex justify-between items-center">
              <span className="mono text-[10px] text-dim">{taskInput.length}/{INPUT_MAX}</span>
              {trainError && (
                <span className="mono text-[10px]" style={{ color: "#FFFFFF" }}>✗ {trainError}</span>
              )}
            </div>

            <button
              onClick={runTask}
              disabled={!taskInput.trim() || running || atLimit}
              className={atLimit ? "btn-outline w-full" : "btn-amber w-full"}
              style={{ opacity: (!taskInput.trim() || atLimit) ? 0.4 : 1 }}
            >
              {running ? (
                <span>AGENT WORKING<span className="blink">...</span></span>
              ) : atLimit ? (
                "DAILY LIMIT REACHED"
              ) : (
                "► RUN TASK"
              )}
            </button>
          </div>

          {/* Task output */}
          {taskOutput && (
            <div className="numina-card bracketed p-0 fade-up">
              <div className="terminal-bar">
                {["#333333", "#555555", "#777777"].map((c) => (
                  <span
                    key={c}
                    style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }}
                  />
                ))}
                <span className="mono text-[10px] text-dim ml-2">
                  {div ? `numina_${div.name.toLowerCase().replace(/\s+/g, "_")}.out` : "output.out"}
                </span>
              </div>
              <div
                className="terminal"
                style={{ maxHeight: 280, overflowY: "auto", color: "#FFFFFF", whiteSpace: "pre-wrap" }}
              >
                {taskOutput}
              </div>
              {lastFragsEarned !== null && (
                <div
                  className="px-4 py-2 flex justify-between items-center"
                  style={{ borderTop: "1px solid #222222", background: "#080808" }}
                >
                  <span className="mono text-[10px] text-dim">FRAGMENTS EARNED</span>
                  <span className="pixel text-[8px] text-primary">+{lastFragsEarned}</span>
                </div>
              )}
            </div>
          )}

          {/* Collapse data */}
          <div className="numina-card bracketed p-4 flex flex-col gap-1.5">
            <p className="pixel text-[7px] text-dim mb-1">// COLLAPSE DATA</p>
            {[
              ["FRAGMENT",   agent.fragment_id],
              ["SOUL HASH",  agent.soul_hash.slice(0, 16) + "..."],
              ["TASKS RUN",  String(agent.task_count ?? 0)],
              ["STATUS",     "ACTIVE"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <span className="mono text-[10px] text-dim shrink-0">{k}</span>
                <span className="mono text-[10px] text-primary text-right truncate">{v}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </main>
  );
}
