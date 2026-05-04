"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import PixelAvatar from "@/components/PixelAvatar";
import { DIVISIONS, TIERS, SKILLS, MEMORIES, type DivisionKey, type TierKey } from "@/lib/divisions";

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage = "idle"|"loading"|"spinning"|"revealed"|"tasking"|"running"|"done";

interface AgentData {
  division: DivisionKey;
  tier: TierKey;
  skill: string;
  memory: string;
  soul: string;
  entropy: string;
  soulFragment: string;
  tokenId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DIV_KEYS = Object.keys(DIVISIONS) as DivisionKey[];
const TIER_KEYS_LIST = Object.keys(TIERS) as TierKey[];
const SOUL_NAMES = ["FRACTURE","ECHO","PRISM","VECTOR","AXIOM","NULL","OMEGA","DELTA","GHOST","APEX"];

function randomFrom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomHex(len: number) { return Array.from({length:len},()=>Math.floor(Math.random()*16).toString(16)).join(""); }

function generateAgent(): AgentData {
  const division = randomFrom(DIV_KEYS);
  const roll = Math.random() * 100;
  const tier: TierKey = roll < 3 ? "prime" : roll < 15 ? "director" : roll < 40 ? "operator" : "recruit";
  return {
    division, tier,
    skill:        randomFrom(SKILLS[division]),
    memory:       randomFrom(MEMORIES),
    soul:         randomFrom(SOUL_NAMES),
    entropy:      "0x" + randomHex(16),
    soulFragment: "ar://" + randomHex(43),
    tokenId:      String(Math.floor(Math.random() * 4444) + 1).padStart(4, "0"),
  };
}

const LOADING_STEPS = [
  { text: "SCANNING ARWEAVE...",         color: "#FFFFFF", delay: 0    },
  { text: "SOUL FRAGMENT DETECTED.",     color: "#FFFFFF", delay: 1400 },
  { text: "ASSEMBLING QUANTUM STATE...", color: "#FFFFFF", delay: 2800 },
  { text: "ERROR: COLLAPSE IMMINENT.",  color: "#FFFFFF", delay: 4400 },
  { text: "JUST KIDDING.",              color: "#FFFFFF", delay: 5400 },
];

const SLOT_OPTS: Record<string, string[]> = {
  DIVISION: DIV_KEYS.map(k => DIVISIONS[k].name.toUpperCase()),
  TIER:     TIER_KEYS_LIST.map(k => TIERS[k].name.toUpperCase()),
  SKILL:    ["SOLIDITY","TYPESCRIPT","AUDIT","RESEARCH","UI SYSTEMS","COMMUNITY","GROWTH","NARRATIVE","ALPHA","ZK PROOFS"],
  MEMORY:   MEMORIES,
  SOUL:     SOUL_NAMES,
};

// ── Slot ─────────────────────────────────────────────────────────────────────

function Slot({ label, finalValue, lockDelay }: { label:string; finalValue:string; lockDelay:number }) {
  const [val, setVal]       = useState("??????");
  const [locked, setLocked] = useState(false);
  const opts = SLOT_OPTS[label] ?? ["???"];

  useEffect(() => {
    const iv = setInterval(() => setVal(randomFrom(opts)), 80);
    const to = setTimeout(() => { clearInterval(iv); setVal(finalValue); setLocked(true); }, lockDelay);
    return () => { clearInterval(iv); clearTimeout(to); };
  }, [finalValue, lockDelay, opts]);

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="pixel text-[6px] text-dim">{label}</span>
      <div className="w-full px-2 py-3 text-center"
           style={{ border: `1px solid ${locked ? "#FFFFFF" : "#222222"}`,
                    background: locked ? "rgba(255,255,255,0.04)" : "#080808",
                    transition: "border-color 0.3s, background 0.3s" }}>
        <span className="pixel" style={{ fontSize: 7, color: "#FFFFFF",
                                         wordBreak:"break-all", lineHeight: 2, display:"block" }}>
          {val}
        </span>
      </div>
      <span className="pixel text-[6px]" style={{ color: locked ? "#FFFFFF" : "#222222" }}>
        {locked ? "LOCKED ✓" : "SPIN..."}
      </span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SummonPage() {
  const [stage, setStage]   = useState<Stage>("idle");
  const [loadStep, setLoadStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [agent, setAgent]   = useState<AgentData | null>(null);
  const [task, setTask]     = useState("");
  const [output, setOutput] = useState("");
  const [taskErr, setTaskErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedOutput, setSavedOutput] = useState(false);

  // saveRef = full capture target (card + optional task panel)
  // taskPanelRef = hidden task output section, shown only during save
  const saveRef     = useRef<HTMLDivElement>(null);
  const taskPanelRef = useRef<HTMLDivElement>(null);

  const summon = useCallback(() => {
    const newAgent = generateAgent();
    setAgent(newAgent);
    setStage("loading");
    setProgress(0);
    setLoadStep(0);

    const piv = setInterval(() => setProgress(p => Math.min(p + 1.6, 95)), 80);
    LOADING_STEPS.forEach(({ delay }, i) => setTimeout(() => setLoadStep(i), delay));

    setTimeout(() => { clearInterval(piv); setProgress(100); setStage("spinning"); }, 6200);
    setTimeout(() => setStage("revealed"), 10400);
  }, []);

  async function runTask() {
    if (!task.trim() || !agent) return;
    setStage("running"); setTaskErr("");
    try {
      const res = await fetch("/api/summon-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ division: agent.division, tier: agent.tier, task: task.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setOutput(data.output);
      setStage("done");
    } catch (e: unknown) {
      setTaskErr(e instanceof Error ? e.message : "Agent offline.");
      setStage("tasking");
    }
  }

  // ── SAVE: capture card (+ task output if done) as PNG ────────────────────────
  async function saveCard() {
    if (!saveRef.current || !agent || !div) return;

    const hasOutput = stage === "done" && !!output;

    // Show the hidden task panel before capture
    if (hasOutput && taskPanelRef.current) {
      taskPanelRef.current.style.display = "block";
    }

    setSaving(true);
    try {
      // Wait one frame so the DOM reflects the panel being shown
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(saveRef.current, {
        backgroundColor: "#000000",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      const suffix = hasOutput ? "-output" : "";
      link.download = `NUMINA-#${agent.tokenId}-${div.name.replace(/\s+/g, "-")}${suffix}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      // Always re-hide the panel after capture
      if (taskPanelRef.current) {
        taskPanelRef.current.style.display = "none";
      }
      setSaving(false);
    }
  }

  // ── SAVE OUTPUT: persist to localStorage for /forge history link ─────────────
  function saveOutput() {
    if (!agent || stage !== "done" || !output) return;
    const entry = {
      division: agent.division,
      tier:     agent.tier,
      tokenId:  agent.tokenId,
      task:     task.trim(),
      output,
      savedAt:  new Date().toISOString(),
    };
    try {
      const raw = localStorage.getItem("numina_saved_outputs");
      const existing: typeof entry[] = raw ? JSON.parse(raw) : [];
      const updated = [entry, ...existing].slice(0, 20);
      localStorage.setItem("numina_saved_outputs", JSON.stringify(updated));
      setSavedOutput(true);
    } catch {
      // localStorage unavailable — silently ignore
    }
  }

  // ── SHARE: open Twitter/X intent with pre-filled tweet ───────────────────────
  function shareOnX() {
    if (!agent || !div || !tier) return;
    const soulHash = agent.soulFragment.replace("ar://", "").slice(0, 8);
    const text = [
      `Just collapsed NUMINA #${agent.tokenId} into existence.`,
      ``,
      `Division: ${div.name}`,
      `Tier: ${tier.name}`,
      `Soul: ${soulHash}`,
      ``,
      `[QUANTUM STATE: RESOLVED]`,
      ``,
      `numinagenesis.vercel.app/summon`,
      ``,
      `#NUMINA #Web3 #AI`,
    ].join("\n");
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function reset() { setStage("idle"); setAgent(null); setTask(""); setOutput(""); setTaskErr(""); setProgress(0); }

  const div  = agent ? DIVISIONS[agent.division] : null;
  const tier = agent ? TIERS[agent.tier]         : null;

  // ── IDLE ──
  if (stage === "idle") return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="flex flex-col items-center gap-8 max-w-md">
        <div className="scanlines p-6" style={{ background: "#080808", border: "1px solid #222222" }}>
          <div className="glitch-fast" style={{ fontSize: 72, color: "#FFFFFF", lineHeight: 1 }}>◈</div>
        </div>
        <div>
          <p className="pixel text-[7px] text-dim mb-3">// THE FORGE</p>
          <h1 className="pixel text-primary glitch leading-loose" style={{ fontSize:"clamp(14px,3vw,22px)" }}>
            SOUL IN<br/>SUPERPOSITION
          </h1>
        </div>
        <p className="mono text-sm text-muted leading-relaxed">
          4,444 soul fragments.<br/>Waiting to be collapsed.
        </p>
        <button onClick={summon} className="btn-amber pulse-amber" style={{ fontSize:11, padding:"16px 32px" }}>
          ► SUMMON AGENT
        </button>
        <p className="mono text-[11px] text-dim">
          No two NUMINA are the same.<br/>Your entropy. Your soul.
        </p>
      </div>
    </main>
  );

  // ── LOADING ──
  if (stage === "loading") {
    const step = LOADING_STEPS[loadStep] ?? LOADING_STEPS[0];
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-md flex flex-col gap-6">
          <p className="pixel text-[7px] text-dim text-center">// QUANTUM COLLAPSE INITIATING</p>
          <div style={{ border:"1px solid #222222" }}>
            <div className="terminal-bar">
              {["#333333","#555555","#777777"].map(c=>(
                <span key={c} style={{width:8,height:8,borderRadius:"50%",background:c,display:"inline-block"}}/>
              ))}
              <span className="mono text-[10px] text-dim ml-2">arweave_scanner.exe</span>
            </div>
            <div className="terminal" style={{ minHeight:110 }}>
              <span style={{color:"#222222"}}>$ ./collapse --soul random --entropy wallet{"\n"}</span>
              <span style={{color: step.color}}>{step.text}</span>
              <span className="blink" style={{color: step.color}}> ▊</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="mono text-[10px] text-dim">COLLAPSE PROGRESS</span>
              <span className="mono text-[10px] text-primary">{Math.round(progress)}%</span>
            </div>
            <div style={{background:"#080808",height:3}}>
              <div style={{width:`${progress}%`,height:3,background:"#FFFFFF",transition:"width 0.08s linear"}}/>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── SPINNING ──
  if (stage === "spinning" && agent) return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-2xl flex flex-col gap-8">
        <div className="text-center">
          <p className="pixel text-[7px] text-dim mb-2">// SOUL COLLAPSE IN PROGRESS</p>
          <h2 className="pixel text-primary" style={{fontSize:"clamp(12px,2vw,18px)"}}>COLLAPSING...</h2>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {[
            { label:"DIVISION", finalValue: DIVISIONS[agent.division].name.toUpperCase(), lockDelay: 800  },
            { label:"TIER",     finalValue: TIERS[agent.tier].name.toUpperCase(),          lockDelay: 1800 },
            { label:"SKILL",    finalValue: agent.skill,                                   lockDelay: 2800 },
            { label:"MEMORY",   finalValue: agent.memory,                                  lockDelay: 3400 },
            { label:"SOUL",     finalValue: agent.soul,                                    lockDelay: 4000 },
          ].map(s => <Slot key={s.label} {...s} />)}
        </div>
        <p className="pixel text-[7px] text-dim text-center">WAVE FUNCTION COLLAPSING · DO NOT CLOSE</p>
      </div>
    </main>
  );

  // ── REVEALED / TASKING / RUNNING / DONE ──
  if (agent && div && tier && ["revealed","tasking","running","done"].includes(stage)) return (
    <main className="px-6 py-12 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

        {/* Left: Agent card */}
        <div className="fade-up flex flex-col gap-4">

          {/* saveRef wraps card + hidden task panel — everything html2canvas captures */}
          <div ref={saveRef} style={{ background: "#000000" }}>
          <div className="numina-card bracketed p-0">
            <div className="flex items-center justify-between px-4 py-2"
                 style={{borderBottom:"1px solid #222222",background:"#080808"}}>
              <span className="pixel text-[7px] text-dim">NUMINA #{agent.tokenId}</span>
              <span className="pixel text-[7px]" style={{color:tier.color}}>{tier.label.toUpperCase()}</span>
            </div>

            <div className="flex items-center justify-center py-8 scanlines"
                 style={{background:"#080808",borderBottom:"1px solid #222222"}}>
              <PixelAvatar division={agent.division} size={96} />
            </div>

            <div className="px-4 py-3 text-center" style={{borderBottom:"1px solid #222222"}}>
              <p className="pixel text-[10px] text-primary mb-1">NUMINA #{agent.tokenId}</p>
              <p className="mono text-[11px] text-muted italic">
                "{div.name.toUpperCase()}. {tier.name.toUpperCase()}. ON-CHAIN."
              </p>
              <p className="mono text-[10px] mt-2" style={{color:"#444444"}}>
                This soul has never existed before. Until now.
              </p>
            </div>

            <div className="px-4 py-3" style={{background:"#080808",borderBottom:"1px solid #222222"}}>
              <p className="pixel text-[7px] text-dim mb-2">// COLLAPSE DATA</p>
              {[
                ["SOUL FRAGMENT", agent.soulFragment],
                ["QUANTUM STATE", "RESOLVED"],
                ["ENTROPY",       agent.entropy],
              ].map(([k,v])=>(
                <div key={k} className="flex justify-between gap-2 py-0.5 min-w-0">
                  <span className="mono text-[10px] text-dim shrink-0">{k}</span>
                  <span className="mono text-[10px] text-primary text-right truncate min-w-0">{v}</span>
                </div>
              ))}
            </div>

            <div className="px-4 py-3">
              <p className="pixel text-[7px] text-dim mb-2">// TRAITS</p>
              {[
                { k:"DIVISION", v:div.name.toUpperCase(),  r:`${div.rarity}%`,  c: div.color  },
                { k:"TIER",     v:tier.name.toUpperCase(), r:`${tier.rarity}%`, c: tier.color },
                { k:"SKILL",    v:agent.skill,             r:"UNIQUE",          c:"#FFFFFF"   },
                { k:"MEMORY",   v:agent.memory,            r:"RARE",            c:"#FFFFFF"   },
                { k:"TASKS",    v:"0",                     r:"UNPROVEN",        c:"#666666"   },
              ].map(({k,v,r,c})=>(
                <div key={k} className="flex justify-between py-1" style={{borderBottom:"1px solid #222222"}}>
                  <span className="mono text-[10px] text-dim">{k}</span>
                  <span className="mono text-[10px]" style={{color:c}}>{v}</span>
                  <span className="mono text-[10px] text-dim">{r}</span>
                </div>
              ))}
            </div>
          </div>{/* end card */}

          {/* Task output panel — hidden in UI, shown only during save capture */}
          <div ref={taskPanelRef} style={{ display: "none", background: "#000000", padding: "16px 16px 20px" }}>
            <div style={{ height: 1, background: "#FFFFFF", marginBottom: 16 }} />
            <p className="pixel text-[7px] text-dim mb-3">// TASK DEPLOYED</p>
            <p className="mono text-[11px] mb-5 leading-relaxed" style={{ color: "#AAAAAA" }}>
              {task.slice(0, 200)}{task.length > 200 ? "..." : ""}
            </p>
            <p className="pixel text-[7px] text-dim mb-3">// OUTPUT</p>
            <p className="mono text-[11px] mb-5 leading-relaxed" style={{ color: "#FFFFFF", whiteSpace: "pre-wrap" }}>
              {output.slice(0, 300)}{output.length > 300 ? "..." : ""}
            </p>
            <p className="pixel text-[7px] text-center" style={{ color: "#444444" }}>
              MINT TO LOG THIS FOREVER
            </p>
          </div>

          </div>{/* end saveRef */}

          {/* Action buttons — outside saveRef so they don't appear in the PNG */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
            <button onClick={saveCard} disabled={saving} className="btn-ghost w-full sm:w-auto">
              {saving ? "SAVING..." : "↓ SAVE"}
            </button>
            <button onClick={shareOnX} className="btn-ghost w-full sm:w-auto">↗ SHARE</button>
            {stage === "revealed" && (
              <button onClick={()=>setStage("tasking")} className="btn-outline w-full sm:w-auto">► DEPLOY TASK</button>
            )}
            <button onClick={reset} className="btn-ghost w-full sm:w-auto">↺ AGAIN</button>
          </div>
        </div>

        {/* Right: Task / Output */}
        <div className="flex flex-col gap-4">
          {stage === "revealed" && (
            <div className="fade-up numina-card bracketed p-8 text-center flex flex-col gap-5">
              <span style={{fontSize:48,color:div.color}}>{div.icon}</span>
              <p className="pixel text-[10px]" style={{color:div.color}}>
                {div.name.toUpperCase()} SOUL COLLAPSED.
              </p>
              <p className="mono text-sm text-muted leading-relaxed">
                Collapsed. Alive. Give it something to do.
              </p>
              <button onClick={()=>setStage("tasking")} className="btn-amber w-full">► DEPLOY TASK</button>
            </div>
          )}

          {["tasking","running","done"].includes(stage) && (
            <div className="fade-up numina-card bracketed p-5">
              <p className="pixel text-[7px] text-dim mb-1">// TASK INPUT</p>
              <p className="pixel text-[8px] mb-4" style={{color:div.color}}>
                {div.name.toUpperCase()} · {tier.name.toUpperCase()}
              </p>
              <textarea value={task} onChange={e=>setTask(e.target.value.slice(0,500))}
                disabled={stage==="running"||stage==="done"}
                rows={4} maxLength={500}
                placeholder={`What do you want your ${div.name} agent to do?`}
                className="w-full mono text-sm px-3 py-2 outline-none resize-none mb-1"
                style={{background:"#080808",border:"1px solid #222222",color:"#FFFFFF"}}/>
              <p className="mono text-[10px] text-dim mb-3">{task.length}/500</p>
              {stage === "tasking" && (
                <button onClick={runTask} disabled={!task.trim()} className="btn-amber w-full">► RUN TASK</button>
              )}
              {stage === "running" && (
                <p className="pixel text-[8px] text-primary text-center py-2">
                  AGENT WORKING<span className="blink">...</span>
                </p>
              )}
              {taskErr && <p className="mono text-xs mt-2" style={{color:"#FFFFFF"}}>✗ {taskErr}</p>}
            </div>
          )}

          {stage === "done" && output && (
            <div className="fade-up numina-card bracketed p-0">
              <div className="terminal-bar">
                {["#333333","#555555","#777777"].map(c=>(
                  <span key={c} style={{width:8,height:8,borderRadius:"50%",background:c,display:"inline-block"}}/>
                ))}
                <span className="mono text-[10px] text-dim ml-2">
                  numina_{div.name.toLowerCase()}.out
                </span>
              </div>
              <div className="terminal" style={{maxHeight:320,overflowY:"auto",color:"#FFFFFF"}}>
                {output}
              </div>
              <div className="px-4 py-3" style={{borderTop:"1px solid #222222",background:"#080808"}}>
                <p className="mono text-[10px] text-dim">
                  Mint. Or this never happened.
                </p>
              </div>
            </div>
          )}

          {/* Save output */}
          <div className="numina-card p-5 flex flex-col gap-3"
               style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)"}}>
            <p className="pixel text-[9px] text-primary">SAVE OUTPUT</p>
            <p className="mono text-[11px] text-muted">
              Save this session to your forge history.
            </p>
            <button
              onClick={saveOutput}
              disabled={stage !== "done" || !output || savedOutput}
              className={stage === "done" && output && !savedOutput ? "btn-amber w-full" : "btn-outline w-full"}
              style={{ opacity: stage === "done" && output && !savedOutput ? 1 : 0.4, cursor: stage === "done" && output && !savedOutput ? "pointer" : "not-allowed" }}
            >
              {savedOutput ? "SAVED ✓" : "► SAVE OUTPUT"}
            </button>
            {savedOutput && (
              <a
                href="/forge"
                className="mono text-[10px] text-dim text-center"
                style={{ textDecoration: "none" }}
              >
                View full history → /forge
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  );

  return null;
}
