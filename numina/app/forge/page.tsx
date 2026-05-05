"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDisconnect } from "wagmi";
import AgentCard from "@/components/AgentCard";
import TaskHistory from "@/components/TaskHistory";
import { ConnectAndSignIn } from "@/components/ConnectAndSignIn";
import { DIVISIONS, TIERS, type DivisionKey, type TierKey } from "@/lib/divisions";
import { WL_THRESHOLD, type PreMintAgent } from "@/lib/supabase-forge";

const DAILY_LIMIT = 10;
const INPUT_MAX   = 200;

// ÔöÇÔöÇ Helpers ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

function tierToRarity(tier: string): "legendary" | "rare" | "uncommon" | "classified" {
  if (tier === "prime")    return "legendary";
  if (tier === "director") return "rare";
  if (tier === "operator") return "uncommon";
  return "classified";
}

// ÔöÇÔöÇ Helpers ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

function hoursUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 3_600_000);
}

// ÔöÇÔöÇ Burn Modal ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

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
            Ô£ò CLOSE
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4">
          <p className="pixel text-[9px] text-center" style={{ color: "#FF4444", letterSpacing: "0.1em" }}>
            THIS CANNOT BE UNDONE
          </p>

          <div className="flex flex-col gap-1.5">
            {([
              ["CURRENT AGENT",    `${div?.name.toUpperCase() ?? "?"} ┬À ${tier?.name.toUpperCase() ?? "?"}`],
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
            <p className="mono text-[10px] text-center" style={{ color: "#FF4444" }}>Ô£ù {burnError}</p>
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
              {burning ? <span>BURNING<span className="blink">...</span></span> : "Ôûá CONFIRM BURN"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ÔöÇÔöÇ Fragment Meter ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

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

// ÔöÇÔöÇ Page ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

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
  const [taskInput,          setTaskInput]          = useState("");
  const [running,            setRunning]            = useState(false);
  const [taskOutput,         setTaskOutput]         = useState("");
  const [trainError,         setTrainError]         = useState("");
  const [tasksToday,         setTasksToday]         = useState(0);
  const [lastFragsEarned,    setLastFragsEarned]    = useState<number | null>(null);

  // tab state
  const [activeTab,   setActiveTab]   = useState<"deploy" | "history">("deploy");
  const [historyKey,  setHistoryKey]  = useState(0);

  // burn state
  const [burnModal,       setBurnModal]       = useState(false);
  const [burning,         setBurning]         = useState(false);
  const [burnError,       setBurnError]       = useState("");
  const [burnCooldownNext, setBurnCooldownNext] = useState<string | null>(null);

  // ÔöÇÔöÇ Session check + initial load ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
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

  // ÔöÇÔöÇ Summon ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
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
      setSummonError("Network error ÔÇö try again");
    } finally {
      setSummoning(false);
    }
  }

  // ÔöÇÔöÇ Run task ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
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
      setHistoryKey((k) => k + 1);
      setActiveTab("history");
    } catch {
      setTrainError("Network error ÔÇö try again");
    } finally {
      setRunning(false);
    }
  }

  // ÔöÇÔöÇ Burn agent ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
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
      // Success ÔÇö replace agent state without full page reload
      setBurnModal(false);
      setAgent(data.new_agent);
      setFragments(data.carried_fragments ?? 0);
      setTasksToday(0);
      setTaskOutput("");
      setLastFragsEarned(null);
      setActiveTab("deploy");
      setBurnCooldownNext(null);
    } catch {
      setBurnError("Network error ÔÇö try again");
    } finally {
      setBurning(false);
    }
  }

  // ÔöÇÔöÇ Loading ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
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
        <ConnectAndSignIn onSessionChange={() => window.location.reload()} />
        <a href="/" className="mono text-xs" style={{ color: "#333333" }}>
          back to home
        </a>
      </main>
    );
  }

  const div  = agent ? DIVISIONS[agent.division as DivisionKey] : null;
  const tier = agent ? TIERS[agent.tier as TierKey]             : null;

  // ÔöÇÔöÇ No agent yet ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  if (!agent) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="flex flex-col items-center gap-8 max-w-md w-full">
          <div className="scanlines p-6" style={{ background: "#080808", border: "1px solid #222222" }}>
            <div className="glitch-fast" style={{ fontSize: 72, color: "#FFFFFF", lineHeight: 1 }}>Ôùê</div>
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
            {summoning ? "COLLAPSING..." : "Ôû║ SUMMON AGENT"}
          </button>
          {summonError && (
            <p className="mono text-xs" style={{ color: "#FFFFFF" }}>Ô£ù {summonError}</p>
          )}
          <p className="mono text-[11px] text-dim">
            Earn soul fragments by completing tasks.<br />500 fragments = guaranteed WL.
          </p>
        </div>
      </main>
    );
  }

  // ÔöÇÔöÇ Has agent ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const atLimit = tasksToday >= DAILY_LIMIT;

  return (
    <>
    {burnModal && (
      <BurnModal
        agent={agent}
        fragments={fragments}
        burning={burning}
        burnError={burnError}
        onConfirm={burnAgent}
        onClose={() => { if (!burning) setBurnModal(false); }}
      />
    )}
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

        {/* ÔöÇÔöÇ Left: Agent card ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
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

        {/* ÔöÇÔöÇ Right: meter + tabs ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
        <div className="fade-up flex flex-col gap-5">

          {/* Fragment meter ÔÇö always visible */}
          <div className="numina-card bracketed p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="pixel text-[7px] text-dim mb-1">// SOUL FRAGMENT</p>
                {div && tier && (
                  <p className="pixel text-[9px]" style={{ color: div.color }}>
                    {div.name.toUpperCase()} ┬À {tier.name.toUpperCase()}
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

          {/* Burn button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setBurnModal(true); setBurnError(""); }}
              disabled={!!burnCooldownNext && new Date(burnCooldownNext).getTime() > Date.now()}
              className="mono text-[9px]"
              style={{
                background: "none",
                border:     "1px solid #330000",
                color:      "#994444",
                padding:    "4px 10px",
                cursor:     (!!burnCooldownNext && new Date(burnCooldownNext).getTime() > Date.now()) ? "not-allowed" : "pointer",
                opacity:    (!!burnCooldownNext && new Date(burnCooldownNext).getTime() > Date.now()) ? 0.4 : 1,
              }}
            >
              Ôèù BURN AGENT
            </button>
            <a
              href="/forge/swap"
              className="mono text-[9px]"
              style={{ color: "#555555", textDecoration: "none" }}
            >
              &#8644; SWAP
            </a>
            {burnCooldownNext && new Date(burnCooldownNext).getTime() > Date.now() && (
              <span className="mono text-[9px]" style={{ color: "#664444" }}>
                Next burn in {hoursUntil(burnCooldownNext)}h
              </span>
            )}
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

          {/* ÔöÇÔöÇ DEPLOY tab ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
          {activeTab === "deploy" && (
            <>
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
                    {div.name.toUpperCase()} ┬À {tier.name.toUpperCase()}
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
                    <span className="mono text-[10px]" style={{ color: "#FFFFFF" }}>Ô£ù {trainError}</span>
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
                    "Ôû║ RUN TASK"
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
            </>
          )}

          {/* ÔöÇÔöÇ HISTORY tab ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
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
