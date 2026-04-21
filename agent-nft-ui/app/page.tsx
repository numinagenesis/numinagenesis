"use client";

import { useState, useRef, useEffect } from "react";

// ── Agent definitions ─────────────────────────────────────────────────────────

const AGENTS = [
  {
    id: "frontend_wizard",
    name: "Frontend Wizard",
    tag: "UI / React",
    description: "Pixel-perfect components, performance, and modern CSS.",
    icon: "⬡",
  },
  {
    id: "research_agent",
    name: "Research Agent",
    tag: "Analysis",
    description: "Deep research with structured findings and cited sources.",
    icon: "◈",
  },
  {
    id: "solidity_auditor",
    name: "Solidity Auditor",
    tag: "Security",
    description: "Smart contract vulnerability detection and best practices.",
    icon: "◎",
  },
] as const;

type Agent = (typeof AGENTS)[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

type CodeBlock = { lang: "jsx" | "html" | "css"; code: string };

function detectCodeBlock(text: string): CodeBlock | null {
  const match = text.match(/```(jsx|html|css)\n([\s\S]*?)```/);
  if (!match) return null;
  return { lang: match[1] as CodeBlock["lang"], code: match[2].trim() };
}

function buildSrcdoc(block: CodeBlock): string {
  if (block.lang === "jsx") {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; background: #fff; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${block.code}

    const __names = ['App','Component','Page','Navbar','Header','Footer','Card','Button','Layout','Main'];
    const __found = __names.find(n => { try { return typeof eval(n) === 'function'; } catch(e) { return false; } });
    const __root = ReactDOM.createRoot(document.getElementById('root'));
    if (__found) {
      __root.render(React.createElement(eval(__found)));
    } else {
      __root.render(React.createElement('div', { style: { padding: 16, color: '#888', fontFamily: 'monospace', fontSize: 13 } }, 'No renderable component detected. Define a component named App, Navbar, etc.'));
    }
  </script>
</body>
</html>`;
  }

  if (block.lang === "css") {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; background: #fff; padding: 24px; }
    ${block.code}
  </style>
</head>
<body>
  <p style="color:#888;font-size:13px;font-family:monospace;">CSS preview — add HTML elements to see styles applied.</p>
</body>
</html>`;
  }

  // html
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>*, *::before, *::after { box-sizing: border-box; } body { margin: 0; font-family: system-ui, sans-serif; }</style>
</head>
<body>${block.code}</body>
</html>`;
}

// ── Components ────────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  selected,
  onClick,
}: {
  agent: Agent;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`card-glow text-left w-full rounded-xl border p-6 flex flex-col gap-4 cursor-pointer ${
        selected ? "card-selected" : "border-border"
      }`}
      style={{ background: "#0d0d0d" }}
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl" style={{ color: "#0066FF", fontFamily: "monospace" }}>
          {agent.icon}
        </span>
        <span
          className="text-xs font-mono px-2 py-0.5 rounded-full"
          style={{
            background: selected ? "rgba(0,102,255,0.15)" : "#111",
            color: selected ? "#4d94ff" : "#555",
            border: `1px solid ${selected ? "rgba(0,102,255,0.3)" : "#1c1c1c"}`,
          }}
        >
          {agent.tag}
        </span>
      </div>

      <div>
        <div className="font-semibold text-base mb-1" style={{ color: "#e8e8e8" }}>
          {agent.name}
        </div>
        <div className="text-sm leading-relaxed" style={{ color: "#555" }}>
          {agent.description}
        </div>
      </div>

      <div
        className="text-xs font-medium mt-auto"
        style={{ color: selected ? "#0066FF" : "#444" }}
      >
        {selected ? "Selected →" : "Run Task →"}
      </div>
    </button>
  );
}

function TaskRunner({ agent }: { agent: Agent }) {
  const [task, setTask] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"code" | "preview">("code");
  const outputRef = useRef<HTMLDivElement>(null);

  const codeBlock = output ? detectCodeBlock(output) : null;

  useEffect(() => {
    if (output && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    // Reset to code view when new output arrives
    setView("code");
  }, [output]);

  async function run() {
    if (!task.trim() || loading) return;
    setLoading(true);
    setOutput("");
    setError("");

    try {
      const res = await fetch("/api/run-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentRole: agent.id, task: task.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setOutput(data.result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-in mt-16 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: "#0d0d0d", color: "#0066FF", border: "1px solid rgba(0,102,255,0.2)" }}>
          {agent.name}
        </span>
        <span className="text-sm" style={{ color: "#444" }}>ready to work</span>
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Describe your task..."
          className="flex-1 rounded-lg px-4 py-3 text-sm outline-none"
          style={{
            background: "#0d0d0d",
            border: "1px solid #1c1c1c",
            color: "#e8e8e8",
            fontFamily: "Space Grotesk, sans-serif",
          }}
          disabled={loading}
          autoFocus
        />
        <button
          onClick={run}
          disabled={!task.trim() || loading}
          className="btn-primary px-6 py-3 rounded-lg text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {loading ? "Running..." : "Run"}
        </button>
      </div>

      {/* Output */}
      {(loading || output || error) && (
        <div ref={outputRef} className="fade-in mt-4 rounded-xl overflow-hidden" style={{ border: "1px solid #1c1c1c" }}>
          {/* Terminal bar */}
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#0a0a0a", borderBottom: "1px solid #141414" }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
            <span className="ml-2 text-xs font-mono" style={{ color: "#333" }}>output</span>

            {/* Code / Preview toggle — only when a renderable code block is detected */}
            {codeBlock && (
              <div className="ml-auto flex items-center gap-1 rounded-md p-0.5" style={{ background: "#111", border: "1px solid #1c1c1c" }}>
                {(["code", "preview"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className="px-3 py-1 rounded text-xs font-mono transition-all"
                    style={{
                      background: view === v ? "#1a1a1a" : "transparent",
                      color: view === v ? "#e8e8e8" : "#444",
                      border: view === v ? "1px solid #2a2a2a" : "1px solid transparent",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Code view */}
          {view === "code" && (
            <div className="p-5" style={{ background: "#060606" }}>
              {loading && (
                <div className="terminal flex items-center gap-2" style={{ color: "#0066FF" }}>
                  <span className="blink">▊</span>
                  <span style={{ color: "#333" }}>processing task...</span>
                </div>
              )}
              {error && (
                <div className="terminal" style={{ color: "#ff4444" }}>
                  Error: {error}
                </div>
              )}
              {output && (
                <div className="terminal whitespace-pre-wrap" style={{ color: "#c8c8c8" }}>
                  {output}
                </div>
              )}
            </div>
          )}

          {/* Preview view */}
          {view === "preview" && codeBlock && (
            <iframe
              key={output} // re-mount on new output
              srcDoc={buildSrcdoc(codeBlock)}
              sandbox="allow-scripts"
              className="w-full"
              style={{ height: "480px", border: "none", background: "#fff", display: "block" }}
            />
          )}

          {/* Footer note */}
          {output && (
            <div className="px-5 py-3" style={{ background: "#060606", borderTop: "1px solid #0f0f0f" }}>
              <p className="text-xs font-mono" style={{ color: "#2a2a2a" }}>
                This output will be logged on-chain when you mint
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [selected, setSelected] = useState<Agent | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  function handleTryAgent() {
    pickerRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function handleSelect(agent: Agent) {
    setSelected(agent);
  }

  return (
    <main className="min-h-screen" style={{ background: "#080808" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <span className="font-mono text-sm font-medium" style={{ color: "#e8e8e8" }}>
          agent<span style={{ color: "#0066FF" }}>nft</span>
        </span>
        <span className="text-xs font-mono px-2.5 py-1 rounded-full" style={{ background: "#0d0d0d", color: "#333", border: "1px solid #1a1a1a" }}>
          Sepolia testnet
        </span>
      </nav>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-24 pb-32">
        <div
          className="inline-block text-xs font-mono px-3 py-1.5 rounded-full mb-8"
          style={{ background: "rgba(0,102,255,0.08)", color: "#0066FF", border: "1px solid rgba(0,102,255,0.15)" }}
        >
          ERC-8004 · Trustless Agents
        </div>

        <h1 className="text-5xl font-bold leading-tight tracking-tight mb-5" style={{ maxWidth: "640px", color: "#f0f0f0" }}>
          Your AI Agent.{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #0066FF, #4d94ff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            On-Chain Forever.
          </span>
        </h1>

        <p className="text-lg mb-10" style={{ color: "#555", maxWidth: "440px" }}>
          Mint a specialist, assign a task, own the result.
        </p>

        <button
          onClick={handleTryAgent}
          className="btn-primary px-7 py-3.5 rounded-lg font-medium text-sm"
        >
          Try an Agent
        </button>
      </section>

      {/* ── Agent Picker ── */}
      <section ref={pickerRef} className="px-6 pb-10 max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: "#333" }}>
            01 / Select
          </p>
          <h2 className="text-2xl font-semibold" style={{ color: "#e0e0e0" }}>
            Choose your specialist
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {AGENTS.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              selected={selected?.id === agent.id}
              onClick={() => handleSelect(agent)}
            />
          ))}
        </div>
      </section>

      {/* ── Task Runner ── */}
      {selected && (
        <section className="px-6 pb-32 max-w-4xl mx-auto">
          <div className="mb-8">
            <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: "#333" }}>
              02 / Execute
            </p>
            <h2 className="text-2xl font-semibold" style={{ color: "#e0e0e0" }}>
              Assign the task
            </h2>
          </div>
          <TaskRunner agent={selected} />
        </section>
      )}

      {/* Footer */}
      <footer className="text-center pb-12">
        <p className="text-xs font-mono" style={{ color: "#222" }}>
          Built on ERC-8004 · Sepolia · {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
