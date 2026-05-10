"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type FormState = {
  // Section 1 — Your Group
  group_name:         string;
  group_twitter:      string;
  // Section 2 — What You Want
  requested_spots:    string;
  wl_gtd:             boolean;
  wl_fcfs:            boolean;
  // Section 3 — You
  submitter_twitter:  string;
  wallet:             string;
  notes:              string;
  verification_tweet: string;
};

type Status = "idle" | "submitting" | "done" | "error";

const INITIAL: FormState = {
  group_name:         "",
  group_twitter:      "",
  requested_spots:    "",
  wl_gtd:             true,
  wl_fcfs:            false,
  submitter_twitter:  "",
  wallet:             "",
  notes:              "",
  verification_tweet: "",
};

// ── Shared styles ─────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  background:  "#080808",
  border:      "1px solid #222222",
  color:       "#FFFFFF",
  padding:     "10px 12px",
  fontFamily:  "Courier New, Courier, monospace",
  fontSize:    12,
  width:       "100%",
  outline:     "none",
};

const LABEL = "pixel text-[7px] text-dim block mb-2";

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5" style={{ borderBottom: "1px solid #1a1a1a", paddingBottom: 10 }}>
      <span className="pixel text-[9px]" style={{ color: "#444444" }}>{n}</span>
      <span className="pixel text-[7px]" style={{ color: "#666666" }}>{title}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CollabPage() {
  const [form, setForm]         = useState<FormState>(INITIAL);
  const [status, setStatus]     = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }));
      setErrorMsg(null);
    };
  }

  function toggle(key: "wl_gtd" | "wl_fcfs") {
    return () => setForm(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;

    if (!form.wl_gtd && !form.wl_fcfs) {
      setErrorMsg("Select at least one WL type (GTD or FCFS)");
      return;
    }

    setStatus("submitting");
    setErrorMsg(null);

    const wl_types: string[] = [];
    if (form.wl_gtd)  wl_types.push("GTD");
    if (form.wl_fcfs) wl_types.push("FCFS");

    const payload = {
      group_name:         form.group_name.trim(),
      group_twitter:      form.group_twitter.trim(),
      requested_spots:    form.requested_spots ? parseInt(form.requested_spots, 10) : null,
      wl_type:            wl_types.join(","),
      submitter_twitter:  form.submitter_twitter.trim(),
      wallet:             form.wallet.trim(),
      notes:              form.notes.trim() || null,
      verification_tweet: form.verification_tweet.trim(),
    };

    try {
      const res  = await fetch("/api/collab", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message ?? "Submission failed");
        setStatus("error");
      } else {
        setStatus("done");
      }
    } catch {
      setErrorMsg("Network error - please try again");
      setStatus("error");
    }
  }

  // ── Done state ───────────────────────────────────────────────────────────────

  if (status === "done") {
    return (
      <main className="px-6 py-16 max-w-2xl mx-auto">
        <div className="numina-card bracketed p-10 text-center flex flex-col gap-5">
          <p className="pixel text-[7px] text-dim">// SUBMISSION RECEIVED</p>
          <p className="pixel" style={{ fontSize: "clamp(14px,3vw,24px)", color: "#FFFFFF" }}>
            REQUEST SENT.
          </p>
          <p className="mono text-sm" style={{ color: "#555555", maxWidth: 360, margin: "0 auto" }}>
            Submission received. Tweet verified automatically. You will be contacted via X DM if approved.
          </p>
          <hr className="chain-border" />
          <div className="flex gap-3 justify-center flex-wrap">
            <a href={`/collab/status?twitter=${encodeURIComponent(form.group_twitter)}`}
              className="btn-amber pixel text-[7px]">
              CHECK STATUS
            </a>
            <button
              onClick={() => { setForm(INITIAL); setStatus("idle"); setErrorMsg(null); }}
              className="btn-outline pixel text-[7px]"
            >
              SUBMIT ANOTHER
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────

  return (
    <main className="px-6 py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <p className="pixel text-[8px] text-dim mb-3">// COLLAB REQUEST</p>
        <h1 className="pixel text-[16px] text-primary leading-loose glitch mb-4">
          COLLABORATE.
        </h1>
        <p className="mono text-base text-muted max-w-2xl leading-relaxed">
          Partner with NUMINA for a whitelist allocation. All requests reviewed manually.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* ── Form ── */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="flex flex-col gap-10">

            {/* SECTION 01 — YOUR GROUP */}
            <div className="numina-card bracketed p-6 flex flex-col gap-5">
              <SectionHeader n="01" title="YOUR GROUP" />

              <div>
                <label className={LABEL}>GROUP / PROJECT NAME</label>
                <input
                  type="text"
                  value={form.group_name}
                  onChange={field("group_name")}
                  placeholder="Your project or collection name"
                  maxLength={120}
                  required
                  style={INPUT}
                />
              </div>

              <div>
                <label className={LABEL}>GROUP TWITTER / X HANDLE</label>
                <input
                  type="text"
                  value={form.group_twitter}
                  onChange={field("group_twitter")}
                  placeholder="@yourproject"
                  maxLength={32}
                  required
                  style={INPUT}
                />
              </div>
            </div>

            {/* SECTION 02 — WHAT YOU WANT */}
            <div className="numina-card bracketed p-6 flex flex-col gap-5">
              <SectionHeader n="02" title="WHAT YOU WANT" />

              <div>
                <label className={LABEL}>SPOTS REQUESTED (MAX 50)</label>
                <input
                  type="number"
                  value={form.requested_spots}
                  onChange={field("requested_spots")}
                  placeholder="10"
                  min={1}
                  max={50}
                  required
                  style={INPUT}
                />
              </div>

              <div>
                <label className={LABEL}>WL TYPE</label>
                <div className="flex gap-6 mt-1">
                  {(["wl_gtd", "wl_fcfs"] as const).map((key) => {
                    const label   = key === "wl_gtd" ? "GTD" : "FCFS";
                    const checked = form[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={toggle(key)}
                        className="flex items-center gap-2"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        <span
                          style={{
                            display:    "inline-block",
                            width:      14,
                            height:     14,
                            border:     `1px solid ${checked ? "#FFFFFF" : "#333333"}`,
                            background: checked ? "#FFFFFF" : "transparent",
                            flexShrink: 0,
                          }}
                        />
                        <span className="pixel text-[7px]" style={{ color: checked ? "#FFFFFF" : "#444444" }}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mono" style={{ fontSize: 10, color: "#333333", marginTop: 6 }}>
                  GTD = guaranteed allocation. FCFS = first-come-first-served. Select one or both.
                </p>
              </div>
            </div>

            {/* SECTION 03 — YOU */}
            <div className="numina-card bracketed p-6 flex flex-col gap-5">
              <SectionHeader n="03" title="YOU" />

              <div>
                <label className={LABEL}>YOUR TWITTER / X HANDLE</label>
                <input
                  type="text"
                  value={form.submitter_twitter}
                  onChange={field("submitter_twitter")}
                  placeholder="@you"
                  maxLength={32}
                  required
                  style={INPUT}
                />
                <p className="mono" style={{ fontSize: 10, color: "#333333", marginTop: 4 }}>
                  The person submitting this request (not the project handle)
                </p>
              </div>

              <div>
                <label className={LABEL}>WALLET ADDRESS</label>
                <input
                  type="text"
                  value={form.wallet}
                  onChange={field("wallet")}
                  placeholder="0x..."
                  maxLength={64}
                  required
                  style={INPUT}
                />
              </div>

              <div>
                <label className={LABEL}>
                  NOTES <span className="text-dim">(OPTIONAL - {form.notes.length}/500)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={field("notes")}
                  placeholder="Anything else we should know..."
                  rows={3}
                  maxLength={500}
                  style={{ ...INPUT, resize: "vertical" }}
                />
              </div>

              <div>
                <label className={LABEL}>VERIFICATION TWEET URL</label>
                <input
                  type="text"
                  value={form.verification_tweet}
                  onChange={field("verification_tweet")}
                  placeholder="https://x.com/yourproject/status/..."
                  maxLength={256}
                  required
                  style={INPUT}
                />
                <p className="mono" style={{ fontSize: 10, color: "#333333", marginTop: 4 }}>
                  Tweet must be posted from your group Twitter account and mention @NUMINA.
                </p>
              </div>
            </div>

            {status === "error" && errorMsg && (
              <p className="mono text-xs" style={{ color: "#FF4444" }}>
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="btn-amber pixel text-[7px]"
              style={{ minHeight: 44 }}
            >
              {status === "submitting" ? "VERIFYING + SUBMITTING..." : "► SUBMIT REQUEST"}
            </button>
          </form>
        </div>

        {/* ── Sidebar ── */}
        <div className="flex flex-col gap-5">
          <div className="numina-card bracketed p-5">
            <p className="pixel text-[7px] text-dim mb-4">// COLLAB RULES</p>
            <div className="flex flex-col gap-3">
              {[
                "Max 50 spots per partner",
                "Tweet must be from your group account",
                "GTD and/or FCFS allocation",
                "All requests reviewed manually",
                "Approved partners notified via DM",
              ].map((rule, i) => (
                <div key={i} className="flex gap-3">
                  <span className="pixel text-[7px] text-primary shrink-0 mt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="mono text-xs" style={{ color: "#555555" }}>
                    {rule}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="numina-card bracketed p-5">
            <p className="pixel text-[7px] text-dim mb-4">// WHAT HAPPENS NEXT</p>
            <div className="flex flex-col gap-3">
              {[
                "Tweet auto-verified on submit",
                "Team reviews request",
                "Spots allocated on approval",
                "You get DM on X",
              ].map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="pixel text-[7px] text-dim shrink-0">→</span>
                  <span className="mono text-xs" style={{ color: "#555555" }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="numina-card bracketed p-5">
            <p className="pixel text-[7px] text-dim mb-3">// ALREADY SUBMITTED?</p>
            <a href="/collab/status" className="btn-ghost pixel text-[7px] block text-center" style={{ minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
              CHECK STATUS
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
