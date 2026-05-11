"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDisconnect } from "wagmi";
import AgentCard from "@/components/AgentCard";
import TaskHistory from "@/components/TaskHistory";
import { ConnectAndSignIn } from "@/components/ConnectAndSignIn";
import { DIVISIONS, TIERS, type DivisionKey, type TierKey } from "@/lib/divisions";
import { WL_THRESHOLD, type PreMintAgent } from "@/lib/supabase-forge";

const DAILY_LIMIT = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function tierToRarity(tier: string): "legendary" | "rare" | "uncommon" | "classified" {
  if (tier === "prime")    return "legendary";
  if (tier === "director") return "rare";
  if (tier === "operator") return "uncommon";
  return "classified";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hoursUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 3_600_000);
}

// ── Burn Modal ────────────────────────────────────────────────────────────────

function BurnModal({
  agent,
  fragments,
  burning,
  burnError,
  onConfirm,
  onClose,
}: {
  agent: PreMintAgent;
  fragments: number;
  burning: boolean;
  burnError: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const div  = DIVISIONS[agent.division as DivisionKey];
  const tier = TIERS[agent.tier as TierKey];
  const carryOver = Math.floor(fragments * 0.5);
  const forfeit   = fragments - carryOver;

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.92)",
        zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="numina-card bracketed p-0"
        style={{ maxWidth: 480, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid #330000", background: "#0A0000", flexShrink: 0 }}
        >
          <span className="pixel text-[7px]" style={{ color: "#FF4444" }}>// BURN AGENT</span>
          <button
            onClick={onClose}
            className="mono text-[10px] text-dim"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
          >
            x CLOSE
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4">
          <p className="pixel text-[9px] text-center" style={{ color: "#FF4444", letterSpacing: "0.1em" }}>
            THIS CANNOT BE UNDONE
          </p>

          <div className="flex flex-col gap-1.5">
            {([
              ["CURRENT AGENT",    `${div?.name.toUpperCase() ?? "?"} · ${tier?.name.toUpperCase() ?? "?"}`],
              ["CURRENT BALANCE",  `${fragments} fragments`],
              ["CARRY OVER (50%)", `${carryOver} fragments`],
              ["FORFEIT (50%)",    `${forfeit} fragments`],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <span className="mono text-[10px] text-dim shrink-0">{k}</span>
                <span
                  className="mono text-[10px] text-right"
                  style={{ color: k === "FORFEIT (50%)" ? "#FF4444" : "#FFFFFF" }}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>

          {burnError && (
            <p className="mono text-[10px] text-center" style={{ color: "#FF4444" }}>x {burnError}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={burning}
              className="btn-outline flex-1"
              style={{ fontSize: 10 }}
            >
              CANCEL
            </button>
            <button
              onClick={onConfirm}
              disabled={burning}
              className="flex-1"
              style={{
                background:  burning ? "#1a0000" : "#330000",
                border:      "1px solid #FF4444",
                color:       "#FF4444",
                fontFamily:  "inherit",
                fontSize:    10,
                padding:     "10px 16px",
                cursor:      burning ? "not-allowed" : "pointer",
                opacity:     burning ? 0.6 : 1,
              }}
            >
              {burning ? <span>BURNING<span className="blink">...</span></span> : "> CONFIRM BURN"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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
  const { disconnect } = useDisconnect();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // agent state
  const [loadState,    setLoadState]    = useState<LoadState>("checking");
  const [agent,        setAgent]        = useState<PreMintAgent | null>(null);
  const [fragments,    setFragments]    = useState(0);
  const [summoning,    setSummoning]    = useState(false);
  const [summonError,  setSummonError]  = useState("");

  // training state
  const [taskOutput,      setTaskOutput]      = useState("");
  const [trainError,      setTrainError]      = useState("");
  const [tasksToday,      setTasksToday]      = useState(0);
  const [lastFragsEarned, setLastFragsEarned] = useState<number | null>(null);

  // quantum event
  type QuantumState = { active: boolean; multiplier: number; time_remaining_seconds: number } | null;
  const [quantumEvent,    setQuantumEvent]    = useState<QuantumState>(null);
  const [qSecsLeft,       setQSecsLeft]       = useState(0);

  // mission state
  type MissionState = "idle" | "loading_mission" | "mission_ready" | "submitting" | "rate_limited";
  const [missionState,    setMissionState]    = useState<MissionState>("idle");
  const [currentMission,  setCurrentMission]  = useState("");
  const [missionResponse, setMissionResponse] = useState("");
  const [missionError,    setMissionError]    = useState("");

  // rate-limit countdown
  const RATE_LIMIT_SECS = 30;
  const [countdown,       setCountdown]       = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRetry = useRef<"mission" | "deploy" | null>(null);

  // tab state
  const [activeTab,   setActiveTab]   = useState<"deploy" | "history">("deploy");
  const [historyKey,  setHistoryKey]  = useState(0);

  // burn state
  const [burnModal,       setBurnModal]       = useState(false);
  const [burning,         setBurning]         = useState(false);
  const [burnError,       setBurnError]       = useState("");
  const [burnCooldownNext, setBurnCooldownNext] = useState<string | null>(null);

  // ── Session check + initial load ──────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const [statusRes, quantumRes] = await Promise.all([
        fetch("/api/forge/status"),
        fetch("/api/forge/quantum"),
      ]);
      if (statusRes.ok) {
        const data = await statusRes.json();
        setAgent(data.agent ?? null);
        setFragments(data.fragments ?? 0);
        setTasksToday(data.tasks_today ?? 0);
        setBurnCooldownNext(data.next_burn_at ?? null);
      }
      if (quantumRes.ok) {
        const q = await quantumRes.json();
        if (q.active) {
          setQuantumEvent({ active: true, multiplier: q.multiplier, time_remaining_seconds: q.time_remaining_seconds });
          setQSecsLeft(q.time_remaining_seconds);
        }
      }
    } finally {
      setLoadState("ready");
    }
  }, []);

  // Countdown for quantum event banner
  useEffect(() => {
    if (!quantumEvent?.active) return;
    const t = setInterval(() => {
      setQSecsLeft((prev) => {
        if (prev <= 1) { clearInterval(t); setQuantumEvent(null); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [quantumEvent?.active]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.address) {
          setHasSession(false);
          setLoadState("ready");
          return;
        }
        setHasSession(true);
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
      setSummonError("Network error - try again");
    } finally {
      setSummoning(false);
    }
  }

  // ── Run task ──────────────────────────────────────────────────────────────
  // ── Rate-limit countdown + auto-retry ────────────────────────────────────────
  function startRateLimit(retryFor: "mission" | "deploy") {
    pendingRetry.current = retryFor;
    setMissionState("rate_limited");
    setCountdown(RATE_LIMIT_SECS);

    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          // auto-retry
          if (pendingRetry.current === "mission") getMission();
          else if (pendingRetry.current === "deploy") submitResponse();
          pendingRetry.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // ── Get mission ───────────────────────────────────────────────────────────────
  async function getMission() {
    setMissionState("loading_mission");
    setMissionError("");
    setCurrentMission("");
    setMissionResponse("");
    setTaskOutput("");
    setTrainError("");
    setLastFragsEarned(null);
    try {
      const res  = await fetch("/api/forge/mission", { method: "POST" });
      const data = await res.json();
      if (res.status === 429) { startRateLimit("mission"); return; }
      if (!res.ok) {
        setMissionError(data.message ?? "Failed to generate mission");
        setMissionState("idle");
        return;
      }
      const mission = data.mission ?? "";
      setCurrentMission(mission);
      setMissionResponse(mission);   // pre-fill editable textarea
      setMissionState("mission_ready");
    } catch {
      setMissionError("Network error - try again");
      setMissionState("idle");
    }
  }

  // ── Deploy mission (agent executes it) ───────────────────────────────────────
  async function submitResponse() {
    if (!missionResponse.trim() || missionState !== "mission_ready" || tasksToday >= DAILY_LIMIT) return;
    setMissionState("submitting");
    setTrainError("");
    setLastFragsEarned(null);
    try {
      const res  = await fetch("/api/forge/train", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ input: missionResponse.trim() }),
      });
      const data = await res.json();
      if (res.status === 429 && data.code === "rate_limited") { startRateLimit("deploy"); return; }
      if (!res.ok) {
        setTrainError(data.error ?? "Task failed");
        setMissionState("mission_ready");
        return;
      }
      setTaskOutput(data.output ?? "");
      setFragments(data.new_balance ?? fragments);
      setTasksToday(data.tasks_today ?? tasksToday + 1);
      setLastFragsEarned(data.fragments_earned ?? null);
      setHistoryKey((k) => k + 1);
      setMissionState("idle");
    } catch {
      setTrainError("Network error - try again");
      setMissionState("mission_ready");
    }
  }

  // ── Burn agent ────────────────────────────────────────────────────────────
  async function burnAgent() {
    setBurning(true);
    setBurnError("");
    try {
      const res  = await fetch("/api/forge/burn", { method: "POST" });
      const data = await res.json();
      if (res.status === 429) {
        setBurnCooldownNext(data.next_burn_at ?? null);
        setBurnModal(false);
        return;
      }
      if (!res.ok) { setBurnError(data.error ?? "Burn failed"); return; }
      // Success - replace agent state without full page reload
      setBurnModal(false);
      setAgent(data.new_agent);
      setFragments(data.carried_fragments ?? 0);
      setTasksToday(0);
      setTaskOutput("");
      setLastFragsEarned(null);
      setActiveTab("deploy");
      setBurnCooldownNext(null);
    } catch {
      setBurnError("Network error - try again");
    } finally {
      setBurning(false);
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

  if (loadState === "ready" && hasSession === false) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center gap-6">
        <p className="pixel text-[7px] text-dim">// THE FORGE</p>
        <p className="pixel text-[9px]" style={{ color: "#FFFFFF", letterSpacing: "0.1em" }}>
          CONNECT WALLET TO ACCESS THE FORGE
        </p>
        <ConnectAndSignIn onSessionChange={(addr) => { if (addr) window.location.reload(); }} />
        <a href="/" className="mono text-xs" style={{ color: "#333333" }}>
          back to home
        </a>
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
            <div className="glitch-fast" style={{ fontSize: 72, color: "#FFFFFF", lineHeight: 1 }}>◆</div>
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
            {summoning ? "COLLAPSING..." : "> SUMMON AGENT"}
          </button>
          {summonError && (
            <p className="mono text-xs" style={{ color: "#FFFFFF" }}>x {summonError}</p>
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
    <>
    <main className="px-6 py-12 max-w-4xl mx-auto">
      <div className="flex justify-end mb-4">
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            disconnect();
            router.push("/");
          }}
          className="mono text-xs"
          style={{ color: "#333333", background: "none", border: "none", cursor: "pointer" }}
        >
          DISCONNECT
        </button>
      </div>

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

        {/* ── Right: meter + tabs ───────────────────────────────────────── */}
        <div className="fade-up flex flex-col gap-5">

          {/* Quantum event banner */}
          {quantumEvent?.active && (
            <div
              style={{
                background: "#0A0A00",
                border:     "1px solid #555500",
                padding:    "10px 14px",
                display:    "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span className="pixel text-[8px]" style={{ color: "#FFFF44" }}>
                ⚡ QUANTUM SURGE ACTIVE — {quantumEvent.multiplier}x FRAGMENTS
              </span>
              <span className="mono text-[10px]" style={{ color: "#888800" }}>
                {Math.floor(qSecsLeft / 60)}m {qSecsLeft % 60}s
              </span>
            </div>
          )}

          {/* Fragment meter - always visible */}
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

          {/* Tab bar */}
          <div className="flex" style={{ borderBottom: "1px solid #222222" }}>
            {(["deploy", "history"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="pixel text-[7px] px-5 py-2"
                style={{
                  background:   "transparent",
                  border:       "none",
                  borderBottom: activeTab === tab ? "2px solid #FFFFFF" : "2px solid transparent",
                  color:        activeTab === tab ? "#FFFFFF" : "#666666",
                  cursor:       "pointer",
                  marginBottom: -1,
                }}
              >
                {tab === "deploy" ? "// DEPLOY" : "// HISTORY"}
              </button>
            ))}
          </div>

          {/* ── DEPLOY tab ──────────────────────────────────────────────── */}
          {activeTab === "deploy" && (
            <>
              {/* Mission system */}
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

                {/* IDLE: get mission button */}
                {missionState === "idle" && (
                  <>
                    <button
                      onClick={getMission}
                      disabled={atLimit}
                      className={atLimit ? "btn-outline w-full" : "btn-amber w-full"}
                      style={{ opacity: atLimit ? 0.4 : 1, fontSize: 11, padding: "16px 32px" }}
                    >
                      {atLimit ? "DAILY LIMIT REACHED" : "> GET MISSION"}
                    </button>
                    {missionError && (
                      <span className="mono text-[10px]" style={{ color: "#FFFFFF" }}>x {missionError}</span>
                    )}
                  </>
                )}

                {/* LOADING: spinner */}
                {missionState === "loading_mission" && (
                  <div className="flex items-center justify-center py-4">
                    <span className="pixel text-[8px] text-dim">
                      AGENT GENERATING MISSION<span className="blink">...</span>
                    </span>
                  </div>
                )}

                {/* RATE LIMITED: countdown + auto-retry */}
                {missionState === "rate_limited" && (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <span className="pixel text-[8px]" style={{ color: "#FFFFFF" }}>
                      // AGENT BUSY — Try again in {countdown}s
                    </span>
                    <div style={{ background: "#0A0A0A", height: 2, width: "100%", border: "1px solid #222222" }}>
                      <div
                        style={{
                          height: "100%",
                          background: "#444444",
                          width: `${(countdown / RATE_LIMIT_SECS) * 100}%`,
                          transition: "width 1s linear",
                        }}
                      />
                    </div>
                    <span className="mono text-[10px] text-dim">auto-retrying...</span>
                  </div>
                )}

                {/* MISSION READY / SUBMITTING */}
                {(missionState === "mission_ready" || missionState === "submitting") && (
                  <>
                    {/* Mission briefing (read-only display) */}
                    <div style={{ background: "#080808", border: "1px solid #222222", padding: "12px 14px" }}>
                      <p className="pixel text-[7px] text-dim mb-2">// MISSION BRIEFING</p>
                      <p className="mono text-[11px]" style={{ color: "#FFFFFF", lineHeight: 1.7 }}>
                        {currentMission}
                      </p>
                    </div>

                    {/* Editable mission — pre-filled, user can refine before deploying */}
                    <textarea
                      value={missionResponse}
                      onChange={(e) => setMissionResponse(e.target.value)}
                      disabled={missionState === "submitting"}
                      rows={4}
                      placeholder="Edit mission before deploying..."
                      className="w-full mono text-sm px-3 py-2 outline-none resize-none"
                      style={{
                        background: "#080808",
                        border:     "1px solid #333333",
                        color:      "#AAAAAA",
                      }}
                    />

                    {/* Actions row */}
                    <div className="flex justify-between items-center">
                      <span className="mono text-[10px] text-dim">
                        edit mission or deploy as-is
                      </span>
                      <button
                        onClick={getMission}
                        disabled={missionState === "submitting"}
                        className="mono text-[10px]"
                        style={{
                          background: "none",
                          border:     "none",
                          color:      "#444444",
                          cursor:     missionState === "submitting" ? "not-allowed" : "pointer",
                          padding:    0,
                        }}
                      >
                        get new mission
                      </button>
                    </div>

                    {trainError && (
                      <span className="mono text-[10px]" style={{ color: "#FFFFFF" }}>x {trainError}</span>
                    )}

                    <button
                      onClick={submitResponse}
                      disabled={!missionResponse.trim() || missionState === "submitting"}
                      className="btn-amber w-full"
                      style={{ opacity: !missionResponse.trim() ? 0.4 : 1 }}
                    >
                      {missionState === "submitting" ? (
                        <span>AGENT WORKING<span className="blink">...</span></span>
                      ) : (
                        "> DEPLOY MISSION"
                      )}
                    </button>
                  </>
                )}
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
            </>
          )}

          {/* ── HISTORY tab ─────────────────────────────────────────────── */}
          {activeTab === "history" && (
            <TaskHistory
              division={agent.division as DivisionKey}
              tier={agent.tier as TierKey}
              refreshKey={historyKey}
            />
          )}

        </div>
      </div>
    </main>
    </>
  );
}
