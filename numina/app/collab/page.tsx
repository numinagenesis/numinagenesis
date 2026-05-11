"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type FormState = {
  // Section 1 — Your Group
  group_name:        string;
  group_twitter:     string;
  // Section 2 — What You Want
  requested_spots:   string;
  wl_gtd:            boolean;
  wl_fcfs:           boolean;
  // Section 3 — You
  submitter_twitter: string;
  notes:             string;
};

type Stage = "filling" | "verifying" | "submitted";

const INITIAL: FormState = {
  group_name:        "",
  group_twitter:     "",
  requested_spots:   "",
  wl_gtd:            true,
  wl_fcfs:           false,
  submitter_twitter: "",
  notes:             "",
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
  const [form, setForm]                 = useState<FormState>(INITIAL);
  const [stage, setStage]               = useState<Stage>("filling");
  const [loading, setLoading]           = useState(false);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [verifCode, setVerifCode]       = useState<string | null>(null);
  const [tweetUrl, setTweetUrl]         = useState("");
  const [copied, setCopied]             = useState(false);

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }));
      setErrorMsg(null);
    };
  }

  function toggle(key: "wl_gtd" | "wl_fcfs") {
    return () => setForm(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // Tweet text that will be shown to the user
  const tweetText = verifCode
    ? `Confirming @NUMINA collab request.\nVerification: ${verifCode}\nnuminagenesis.vercel.app/collab`
    : "";

  function handleCopy() {
    if (!tweetText) return;
    navigator.clipboard.writeText(tweetText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleOpenTwitter() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ── Step 1: submit form, get verification code ────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (!form.wl_gtd && !form.wl_fcfs) {
      setErrorMsg("Select at least one WL type (GTD or FCFS)");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const wl_types: string[] = [];
    if (form.wl_gtd)  wl_types.push("GTD");
    if (form.wl_fcfs) wl_types.push("FCFS");

    const payload = {
      group_name:        form.group_name.trim(),
      group_twitter:     form.group_twitter.trim(),
      requested_spots:   form.requested_spots ? parseInt(form.requested_spots, 10) : null,
      wl_type:           wl_types.join(","),
      submitter_twitter: form.submitter_twitter.trim(),
      notes:             form.notes.trim() || null,
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
      } else {
        setSubmissionId(data.submission_id);
        setVerifCode(data.verification_code);
        setStage("verifying");
      }
    } catch {
      setErrorMsg("Network error - please try again");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: verify tweet ──────────────────────────────────────────────────

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !submissionId) return;

    if (!tweetUrl.trim()) {
      setErrorMsg("Paste your tweet URL first");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res  = await fetch("/api/collab", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ submission_id: submissionId, tweet_url: tweetUrl.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message ?? "Verification failed");
      } else {
        setStage("submitted");
      }
    } catch {
      setErrorMsg("Network error - please try again");
    } finally {
      setLoading(false);
    }
  }

  // ── Sidebar (shared) ──────────────────────────────────────────────────────

  const Sidebar = (
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
            "Fill form → get verification code",
            "Post code tweet from group account",
            "Paste tweet URL to verify",
            "Team reviews your request",
            "You get DM on X if approved",
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
  );

  // ── Submitted state ───────────────────────────────────────────────────────

  if (stage === "submitted") {
    return (
      <main className="px-6 py-16 max-w-2xl mx-auto">
        <div className="numina-card bracketed p-10 text-center flex flex-col gap-5">
          <p className="pixel text-[7px] text-dim">// SUBMISSION RECEIVED</p>
          <p className="pixel" style={{ fontSize: "clamp(14px,3vw,24px)", color: "#FFFFFF" }}>
            REQUEST SENT.
          </p>
          <p className="mono text-sm" style={{ color: "#555555", maxWidth: 360, margin: "0 auto" }}>
            Tweet verified. Your request is under review. You will be contacted via X DM if approved.
          </p>
          <hr className="chain-border" />
          <div className="flex gap-3 justify-center flex-wrap">
            <a
              href={`/collab/status?twitter=${encodeURIComponent(form.group_twitter)}`}
              className="btn-amber pixel text-[7px]"
            >
              CHECK STATUS
            </a>
            <button
              onClick={() => {
                setForm(INITIAL);
                setStage("filling");
                setSubmissionId(null);
                setVerifCode(null);
                setTweetUrl("");
                setErrorMsg(null);
              }}
              className="btn-outline pixel text-[7px]"
            >
              SUBMIT ANOTHER
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Verifying state ───────────────────────────────────────────────────────

  if (stage === "verifying") {
    const handle = form.group_twitter.replace(/^@/, "") || "yourproject";

    return (
      <main className="px-6 py-16 max-w-4xl mx-auto">
        <div className="mb-10">
          <p className="pixel text-[8px] text-dim mb-3">// VERIFICATION REQUIRED</p>
          <h1 className="pixel text-[16px] text-primary leading-loose mb-4">
            POST YOUR CODE.
          </h1>
          <p className="mono text-base text-muted max-w-2xl leading-relaxed">
            Post this exact tweet from <span style={{ color: "#FFFFFF" }}>@{handle}</span>, then paste the URL below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-2 flex flex-col gap-6">

            {/* Tweet text */}
            <div className="numina-card bracketed p-6 flex flex-col gap-4">
              <p className={LABEL}>TWEET THIS EXACT TEXT</p>
              <textarea
                readOnly
                value={tweetText}
                rows={4}
                style={{ ...INPUT, resize: "none", color: "#AAAAAA", cursor: "text" }}
              />
              <div className="flex gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn-amber pixel text-[7px]"
                  style={{ minHeight: 38 }}
                >
                  {copied ? "✓ COPIED" : "COPY TWEET"}
                </button>
                <button
                  type="button"
                  onClick={handleOpenTwitter}
                  className="btn-outline pixel text-[7px]"
                  style={{ minHeight: 38 }}
                >
                  OPEN TWITTER ↗
                </button>
              </div>
            </div>

            {/* URL verification */}
            <form onSubmit={handleVerify} className="numina-card bracketed p-6 flex flex-col gap-4">
              <SectionHeader n="→" title="PASTE YOUR TWEET URL" />
              <div>
                <label className={LABEL}>TWEET URL</label>
                <input
                  type="text"
                  value={tweetUrl}
                  onChange={e => { setTweetUrl(e.target.value); setErrorMsg(null); }}
                  placeholder="https://x.com/yourproject/status/..."
                  maxLength={256}
                  required
                  style={INPUT}
                />
                <p className="mono" style={{ fontSize: 10, color: "#333333", marginTop: 4 }}>
                  Paste the URL of the tweet you just posted.
                </p>
              </div>

              {errorMsg && (
                <p className="mono text-xs" style={{ color: "#FF4444" }}>
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-amber pixel text-[7px]"
                style={{ minHeight: 44 }}
              >
                {loading ? "VERIFYING..." : "► VERIFY & SUBMIT"}
              </button>
            </form>

          </div>

          {Sidebar}
        </div>
      </main>
    );
  }

  // ── Filling state (form) ──────────────────────────────────────────────────

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
            </div>

            {errorMsg && (
              <p className="mono text-xs" style={{ color: "#FF4444" }}>
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-amber pixel text-[7px]"
              style={{ minHeight: 44 }}
            >
              {loading ? "SAVING..." : "► CONTINUE TO VERIFICATION"}
            </button>
          </form>
        </div>

        {Sidebar}
      </div>
    </main>
  );
}
