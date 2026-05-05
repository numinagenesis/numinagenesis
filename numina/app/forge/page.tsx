"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDisconnect } from "wagmi";
import { ConnectAndSignIn } from "@/components/ConnectAndSignIn";

// ── Train card ─────────────────────────────────────────────────────────────────

type TrainResult = {
  output: string;
  fragments_earned: number;
  new_balance: number;
  tasks_today: number;
};

function TrainCard() {
  const [taskInput, setTaskInput] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TrainResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runTask() {
    if (!taskInput.trim() || running) return;
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/forge/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: taskInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? "Task failed");
      } else {
        setResult(data as TrainResult);
      }
    } catch {
      setError("Network error - please try again");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="numina-card bracketed" style={{ padding: "28px", background: "#040404" }}>
      <p className="pixel text-[7px] text-dim mb-5">// RUN TASK</p>
      <p className="mono text-sm mb-5" style={{ color: "#555555" }}>
        Train your agent. Earn soul fragments.
      </p>

      {/* Textarea */}
      <textarea
        value={taskInput}
        onChange={(e) => setTaskInput(e.target.value)}
        disabled={running}
        placeholder="Describe your task..."
        rows={4}
        style={{
          width: "100%",
          background: "#080808",
          border: "1px solid #1c1c1c",
          color: "#FFFFFF",
          padding: "12px",
          fontFamily: "Courier New, Courier, monospace",
          fontSize: 12,
          resize: "vertical",
          outline: "none",
          marginBottom: 12,
          boxSizing: "border-box",
        }}
      />

      <button
        onClick={runTask}
        disabled={running || !taskInput.trim()}
        className="btn-amber pixel text-[7px]"
        style={{ width: "100%", minHeight: 40 }}
      >
        {running ? "RUNNING..." : "RUN TASK"}
      </button>

      {/* Error */}
      {error && (
        <p className="mono text-xs mt-4" style={{ color: "#FF4444" }}>
          {error}
        </p>
      )}

      {/* Output */}
      {result && (
        <div style={{ marginTop: 16 }}>
          {/* Fragment badge */}
          <div className="flex items-center justify-between mb-3">
            <p className="pixel text-[7px] text-dim">// TASK OUTPUT</p>
            <span
              className="pixel text-[7px]"
              style={{
                color: "#44aa44",
                background: "#081408",
                border: "1px solid #1a3a1a",
                padding: "3px 8px",
              }}
            >
              +{result.fragments_earned} SOUL FRAGMENTS
            </span>
          </div>

          {/* Output box */}
          <div
            className="numina-card bracketed"
            style={{
              background: "#020202",
              padding: "16px",
              border: "1px solid #1a1a1a",
            }}
          >
            <pre
              style={{
                fontFamily: "Courier New, Courier, monospace",
                fontSize: 12,
                color: "#CCCCCC",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
              }}
            >
              {result.output}
            </pre>
          </div>

          {/* Balance row */}
          <div className="flex items-center justify-between mt-3">
            <p className="mono text-xs" style={{ color: "#444444" }}>
              balance: {result.new_balance} fragments
            </p>
            <p className="mono text-xs" style={{ color: "#333333" }}>
              tasks today: {result.tasks_today}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ForgePage() {
  const router = useRouter();
  const { disconnect } = useDisconnect();
  const [sessionAddr, setSessionAddr] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  function handleSession(addr: string | null) {
    setSessionAddr(addr);
    setChecked(true);
  }

  async function handleDisconnect() {
    await fetch("/api/auth/logout", { method: "POST" });
    disconnect();
    router.push("/");
  }

  // Not yet checked — ConnectAndSignIn shows "—" while it fetches /api/auth/me
  if (!checked) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[70vh] px-6">
        <ConnectAndSignIn onSessionChange={handleSession} />
      </main>
    );
  }

  // No session — show connect prompt
  if (!sessionAddr) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center gap-6">
        <p className="pixel text-[7px] text-dim">// THE FORGE</p>
        <h1 className="pixel glitch" style={{ fontSize: "clamp(20px,4vw,36px)", color: "#FFFFFF" }}>
          FORGE
        </h1>
        <p className="mono text-xs" style={{ color: "#444444", maxWidth: 320 }}>
          Connect your wallet to access the pre-mint agent utility layer.
        </p>
        <ConnectAndSignIn onSessionChange={handleSession} />
        <button
          onClick={() => router.push("/")}
          className="mono text-xs"
          style={{ color: "#333333", background: "none", border: "none", cursor: "pointer", marginTop: 8 }}
        >
          ← back to home
        </button>
      </main>
    );
  }

  // Connected — show forge content
  return (
    <main className="px-6 py-16 max-w-4xl mx-auto">
      {/* Disconnect */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleDisconnect}
          className="mono text-xs"
          style={{ color: "#333333", background: "none", border: "none", cursor: "pointer" }}
        >
          DISCONNECT
        </button>
      </div>

      {/* Header */}
      <div className="mb-12">
        <p className="pixel text-[8px] text-dim mb-3">// THE FORGE</p>
        <h1 className="pixel text-[16px] text-primary leading-loose glitch mb-4">FORGE.</h1>
        <p className="mono text-base text-muted max-w-2xl leading-relaxed">
          The pre-mint agent utility layer. Burn fragments. Swap divisions. Earn your slot.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Burn card */}
        <div className="numina-card bracketed" style={{ padding: "28px", background: "#040404" }}>
          <p className="pixel text-[7px] text-dim mb-5">// BURN FRAGMENTS</p>
          <p className="mono text-sm mb-6" style={{ color: "#555555" }}>
            Sacrifice fragments to upgrade your agent&apos;s tier. Irreversible.
          </p>

          <div className="flex flex-col gap-3">
            <div
              style={{
                background: "#080808",
                border: "1px solid #1c1c1c",
                padding: "16px",
                textAlign: "center",
              }}
            >
              <p className="pixel text-[7px]" style={{ color: "#333333" }}>
                BURN - COMING SOON
              </p>
            </div>

            <Link
              href="/forge/swap"
              className="mono text-xs"
              style={{
                color: "#555555",
                textDecoration: "none",
                display: "block",
                textAlign: "center",
                paddingTop: 8,
              }}
            >
              &#8644; SWAP MARKETPLACE
            </Link>
          </div>
        </div>

        {/* Info card */}
        <div className="numina-card bracketed" style={{ padding: "28px", background: "#040404" }}>
          <p className="pixel text-[7px] text-dim mb-5">// FORGE FEATURES</p>
          <div className="flex flex-col gap-4">
            {[
              {
                label: "BURN",
                desc: "Consume fragments to power up your agent tier.",
                href: null,
                status: "SOON",
              },
              {
                label: "SWAP",
                desc: "Trade your division with another holder. Fragments stay.",
                href: "/forge/swap",
                status: "LIVE",
              },
              {
                label: "COLLAB",
                desc: "Partner projects apply for whitelist allocation.",
                href: "/collab",
                status: "LIVE",
              },
            ].map((f) => (
              <div
                key={f.label}
                style={{ borderBottom: "1px solid #111111", paddingBottom: 16 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="pixel text-[7px]" style={{ color: "#FFFFFF" }}>
                    {f.label}
                  </p>
                  <span
                    className="pixel text-[6px]"
                    style={{ color: f.status === "LIVE" ? "#44aa44" : "#444444" }}
                  >
                    ● {f.status}
                  </span>
                </div>
                <p className="mono text-xs mb-2" style={{ color: "#444444" }}>
                  {f.desc}
                </p>
                {f.href && (
                  <Link
                    href={f.href}
                    className="pixel text-[7px]"
                    style={{ color: "#555555", textDecoration: "none" }}
                  >
                    → {f.label}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Train section */}
      <div className="mt-8">
        <TrainCard />
      </div>
    </main>
  );
}
