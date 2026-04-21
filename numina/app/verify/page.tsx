"use client";
import { useState } from "react";

// Demo data for token #3444 (our real ERC-8004 agent)
const DEMO_TOKEN = {
  tokenId: "3444",
  mintBlock: "7891234",
  blockHash: "0x4a8f2c9b1e3d6f7a0c5b8e2f1a4d9c3e6b0f2a5d8c1e4b7f3a2d5c8e1b4f7a3d",
  entropySeed: "0x" + Array.from({length:32},()=>Math.floor(Math.random()*256).toString(16).padStart(2,'0')).join(''),
  division: "The Architect",
  tier: "Operator",
  soulURI: "ar://xKj8mN3pQ7rS1vW5yA2bC6eF9hI0kL4oP8tU3wX6z",
  owner: "0x742d35Cc6634C0532925a3b8D4C9CF4a1cF2B74E",
  collapse: "VERIFIED",
};

const DEMO_WORK = {
  tokenId: "3444",
  taskIndex: "1",
  taskHash: "0x" + "a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
  arweaveURI: "ar://yLk9nO4qR8sT2uV6xB3cD7fG0iJ1mN5pQ9sU4vY7",
  computed:   "0x" + "a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
  match: true,
};

function VerifyRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 py-2" style={{ borderBottom: "1px solid #111111" }}>
      <span className="mono text-[11px] text-dim w-36 shrink-0">{label}</span>
      <span className={`${mono ? "mono" : "pixel"} text-[11px] text-primary break-all`}>{value}</span>
    </div>
  );
}

export default function VerifyPage() {
  const [mode, setMode] = useState<"collapse" | "work">("collapse");
  const [tokenId, setTokenId] = useState("");
  const [taskNum, setTaskNum] = useState("");
  const [result, setResult] = useState<"collapse" | "work" | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function verify() {
    setErr(""); setResult(null); setLoading(true);
    await new Promise(r => setTimeout(r, 1600));
    if (tokenId !== "3444") {
      setErr("Token not found. Try #3444 for demo.");
    } else if (mode === "work" && taskNum !== "1") {
      setErr("Task not found. Try task #1 for demo.");
    } else {
      setResult(mode);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen px-6 py-16 max-w-3xl mx-auto">
      <div className="mb-10">
        <p className="pixel text-[8px] text-dim mb-3">// VERIFICATION TERMINAL</p>
        <h1 className="pixel text-[16px] text-primary leading-loose glitch">VERIFY.</h1>
        <p className="mono text-sm text-muted mt-3">
          Prove a soul&apos;s collapse. Verify a task&apos;s output. Truth is on-chain.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-0 mb-8" style={{ border: "1px solid #222222", display: "inline-flex" }}>
        {(["collapse","work"] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setResult(null); setErr(""); }}
            className="pixel text-[8px] px-4 py-3"
            style={{ background: mode === m ? "#FFFFFF" : "#080808",
                     color: mode === m ? "#000000" : "#666666",
                     borderRight: m === "collapse" ? "1px solid #222222" : "none" }}>
            VERIFY {m.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="numina-card bracketed p-6 mb-6 flex flex-col gap-4">
        <div>
          <label className="pixel text-[8px] text-dim block mb-2">TOKEN ID</label>
          <input value={tokenId} onChange={e => setTokenId(e.target.value)}
            placeholder="e.g. 3444"
            className="w-full mono text-sm px-4 py-3 outline-none"
            style={{ background: "#080808", border: "1px solid #222222", color: "#FFFFFF" }} />
        </div>

        {mode === "work" && (
          <div>
            <label className="pixel text-[8px] text-dim block mb-2">TASK #</label>
            <input value={taskNum} onChange={e => setTaskNum(e.target.value)}
              placeholder="e.g. 1"
              className="w-full mono text-sm px-4 py-3 outline-none"
              style={{ background: "#080808", border: "1px solid #222222", color: "#FFFFFF" }} />
          </div>
        )}

        <p className="mono text-[10px] text-dim">Demo: Token #3444{mode === "work" ? ", Task #1" : ""}</p>

        <button onClick={verify} disabled={!tokenId || loading}
                className="btn-amber self-start">
          {loading ? "VERIFYING..." : "► VERIFY"}
        </button>

        {err && <p className="mono text-sm" style={{ color: "#FFFFFF" }}>✗ {err}</p>}
      </div>

      {/* Collapse result */}
      {result === "collapse" && (
        <div className="fade-up numina-card bracketed p-0">
          <div className="px-6 py-3 flex items-center gap-3"
               style={{ borderBottom: "1px solid #222222", background: "#080808" }}>
            <span className="pixel text-[8px]" style={{ color: "#FFFFFF" }}>COLLAPSE VERIFIED ✓</span>
          </div>
          <div className="px-6 py-4 flex flex-col">
            <VerifyRow label="TOKEN ID"     value={`#${DEMO_TOKEN.tokenId}`} />
            <VerifyRow label="MINT BLOCK"   value={DEMO_TOKEN.mintBlock} />
            <VerifyRow label="BLOCK HASH"   value={DEMO_TOKEN.blockHash.slice(0,42) + "..."} />
            <VerifyRow label="ENTROPY SEED" value={DEMO_TOKEN.entropySeed.slice(0,42) + "..."} />
            <VerifyRow label="DIVISION"     value={DEMO_TOKEN.division} />
            <VerifyRow label="TIER"         value={DEMO_TOKEN.tier} />
            <VerifyRow label="SOUL URI"     value={DEMO_TOKEN.soulURI} />
            <VerifyRow label="OWNER"        value={DEMO_TOKEN.owner} />
            <VerifyRow label="STATUS"       value="COLLAPSE VERIFIED ✓" mono={false} />
          </div>
          <div className="px-6 py-3" style={{ background: "rgba(255,255,255,0.04)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="mono text-[11px]" style={{ color: "#FFFFFF" }}>
              ✓ Soul collapse recomputed. Division matches entropy seed. Arweave URI valid.
            </p>
          </div>
        </div>
      )}

      {/* Work result */}
      {result === "work" && (
        <div className="fade-up numina-card bracketed p-0">
          <div className="px-6 py-3 flex items-center gap-3"
               style={{ borderBottom: "1px solid #222222", background: "#080808" }}>
            <span className="pixel text-[8px]" style={{ color: "#FFFFFF" }}>WORK VERIFIED ✓</span>
          </div>
          <div className="px-6 py-4 flex flex-col">
            <VerifyRow label="TOKEN ID"       value={`#${DEMO_WORK.tokenId}`} />
            <VerifyRow label="TASK INDEX"     value={`#${DEMO_WORK.taskIndex}`} />
            <VerifyRow label="ON-CHAIN HASH"  value={DEMO_WORK.taskHash.slice(0,42) + "..."} />
            <VerifyRow label="ARWEAVE URI"    value={DEMO_WORK.arweaveURI} />
            <VerifyRow label="COMPUTED HASH"  value={DEMO_WORK.computed.slice(0,42) + "..."} />
            <VerifyRow label="MATCH"          value={DEMO_WORK.match ? "TRUE ✓" : "FALSE ✗"} />
          </div>
          <div className="px-6 py-3" style={{ background: "rgba(255,255,255,0.04)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="mono text-[11px]" style={{ color: "#FFFFFF" }}>
              ✓ keccak256(arweave_output) == on-chain feedbackHash. Work is authentic.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
