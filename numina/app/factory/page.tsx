"use client";
import { useState, useEffect } from "react";
import { DIVISIONS, BUILDER_DIVISIONS, COMMUNITY_DIVISIONS, type DivisionKey } from "@/lib/divisions";

const ALL_DIVISIONS = [...BUILDER_DIVISIONS, ...COMMUNITY_DIVISIONS];

interface Submission { id: string; personaName: string; division: string; handle: string | null; createdAt: string; }

export default function FactoryPage() {
  const [division, setDivision]     = useState<DivisionKey>("engineering");
  const [personaName, setPersonaName] = useState("");
  const [soul, setSoul]             = useState("");
  const [handle, setHandle]         = useState("");
  const [status, setStatus]         = useState<"idle"|"submitting"|"done"|"error">("idle");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal]           = useState(5);

  useEffect(() => {
    fetch("/api/factory-submissions")
      .then(r => r.json())
      .then(d => { setSubmissions(d.submissions); setTotal(d.total); })
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!personaName || !soul) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/factory-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ division, personaName, soul, handle }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  const div = DIVISIONS[division];

  return (
    <main className="px-6 py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <p className="pixel text-[8px] text-dim mb-3">// SOUL FACTORY</p>
        <h1 className="pixel text-[16px] text-primary leading-loose glitch mb-4">SOUL FACTORY.</h1>
        <p className="mono text-base text-muted max-w-2xl leading-relaxed">
          Write a new agent persona. If it fits, it gets woven into the collection —
          on Arweave, forever. Your name in the soul of every agent from that division.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Form */}
        <div>
          {status === "done" ? (
            <div className="numina-card bracketed p-8 text-center flex flex-col gap-4">
              <span className="pixel text-[24px]" style={{ color: "#FFFFFF" }}>✓</span>
              <p className="pixel text-[10px]" style={{ color: "#FFFFFF" }}>SOUL SUBMITTED.</p>
              <p className="mono text-sm text-muted">We&apos;ll review it manually. If accepted, you&apos;ll receive a DM on X.</p>
              <hr className="chain-border" />
              <button onClick={() => { setStatus("idle"); setPersonaName(""); setSoul(""); setHandle(""); }}
                      className="btn-outline">SUBMIT ANOTHER</button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-5">
              {/* Division select */}
              <div>
                <label className="pixel text-[8px] text-dim block mb-2">SELECT DIVISION</label>
                <select value={division} onChange={e => setDivision(e.target.value as DivisionKey)}
                  className="w-full mono text-sm px-4 py-3 outline-none appearance-none"
                  style={{ background: "#080808", border: "1px solid #222222", color: "#FFFFFF" }}>
                  {ALL_DIVISIONS.map(key => (
                    <option key={key} value={key}>
                      {DIVISIONS[key].name.toUpperCase()} — {DIVISIONS[key].track.toUpperCase()} TRACK
                    </option>
                  ))}
                </select>
              </div>

              {/* Persona name */}
              <div>
                <label className="pixel text-[8px] text-dim block mb-2">PERSONA NAME</label>
                <input value={personaName} onChange={e => setPersonaName(e.target.value)}
                  placeholder="e.g. The Watcher, Axiom, Pragma..."
                  maxLength={64}
                  className="w-full mono text-sm px-4 py-3 outline-none"
                  style={{ background: "#080808", border: "1px solid #222222", color: "#FFFFFF" }} />
              </div>

              {/* Soul textarea */}
              <div>
                <label className="pixel text-[8px] text-dim block mb-2">
                  YOUR SOUL <span className="text-muted">({soul.length}/2000)</span>
                </label>
                <textarea value={soul} onChange={e => setSoul(e.target.value)}
                  rows={10} maxLength={2000}
                  placeholder={"Write this agent's personality, goals, voice, and rules.\n\nBe specific. Be weird. Make it real.\n\nThis text may live on Arweave forever."}
                  className="w-full mono text-sm px-4 py-3 outline-none resize-none"
                  style={{ background: "#080808", border: "1px solid #222222", color: "#FFFFFF",
                           lineHeight: "1.7" }} />
              </div>

              {/* Handle */}
              <div>
                <label className="pixel text-[8px] text-dim block mb-2">
                  YOUR HANDLE <span className="text-muted">(optional)</span>
                </label>
                <input value={handle} onChange={e => setHandle(e.target.value)}
                  placeholder="@yourname — credited on Arweave forever"
                  maxLength={32}
                  className="w-full mono text-sm px-4 py-3 outline-none"
                  style={{ background: "#080808", border: "1px solid #222222", color: "#FFFFFF" }} />
              </div>

              {status === "error" && (
                <p className="mono text-sm" style={{ color: "#FFFFFF" }}>✗ Submission failed. Try again.</p>
              )}

              <button type="submit" disabled={!personaName || !soul || status === "submitting"}
                      className="btn-amber self-start">
                {status === "submitting" ? "SUBMITTING..." : "► SUBMIT FOR REVIEW"}
              </button>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Division preview */}
          <div className="numina-card bracketed p-5">
            <p className="pixel text-[8px] text-dim mb-4">// SELECTED DIVISION</p>
            <div className="flex items-center gap-3 mb-3">
              <span className="pixel text-[20px]" style={{ color: div.color }}>{div.icon}</span>
              <div>
                <p className="pixel text-[9px]" style={{ color: div.color }}>{div.name.toUpperCase()}</p>
                <p className="mono text-[10px] text-dim">{div.track.toUpperCase()} TRACK</p>
              </div>
            </div>
            <p className="mono text-[11px] text-muted">{div.description}</p>
          </div>

          {/* How it works */}
          <div className="numina-card bracketed p-5">
            <p className="pixel text-[8px] text-dim mb-4">// HOW IT WORKS</p>
            <div className="flex flex-col gap-3">
              {[
                "Every submission reviewed manually",
                "Best ones uploaded to Arweave",
                "Your handle in the soul file forever",
                "DM on X if accepted",
                "The agents using your soul = yours",
              ].map((step, i) => (
                <div key={i} className="flex gap-3">
                  <span className="pixel text-[8px] text-primary shrink-0">0{i+1}</span>
                  <span className="mono text-[11px] text-muted">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Submissions feed */}
          <div className="numina-card bracketed p-5">
            <p className="pixel text-[8px] text-dim mb-1">// RECENT SOULS</p>
            <p className="mono text-[10px] text-primary mb-4">{total} souls submitted so far</p>
            <div className="flex flex-col gap-2">
              {submissions.map(s => (
                <div key={s.id} className="flex items-center justify-between py-1.5"
                     style={{ borderBottom: "1px solid #080808" }}>
                  <div className="flex flex-col">
                    <span className="mono text-[11px] text-primary">{s.personaName}</span>
                    {s.handle && <span className="mono text-[10px] text-dim">{s.handle}</span>}
                  </div>
                  <span className="mono text-[10px]"
                        style={{ color: DIVISIONS[s.division as DivisionKey]?.color ?? "#666666" }}>
                    {s.division.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
