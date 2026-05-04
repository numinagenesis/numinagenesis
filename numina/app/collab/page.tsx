"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type FormState = {
  project_name: string;
  twitter_handle: string;
  wallet: string;
  offering: string;
  verification_tweet: string;
};

type Status = "idle" | "submitting" | "done" | "error";

const INITIAL: FormState = {
  project_name: "",
  twitter_handle: "",
  wallet: "",
  offering: "",
  verification_tweet: "",
};

// ── Shared input style ────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  background: "#080808",
  border: "1px solid #222222",
  color: "#FFFFFF",
  padding: "10px 12px",
  fontFamily: "Courier New, Courier, monospace",
  fontSize: 12,
  width: "100%",
  outline: "none",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CollabPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function update(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      setErrorMsg(null);
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;

    setStatus("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/collab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message ?? "Submission failed");
        setStatus("error");
      } else {
        setStatus("done");
      }
    } catch {
      setErrorMsg("Network error — please try again");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <main className="px-6 py-16 max-w-2xl mx-auto">
        <div className="numina-card bracketed p-10 text-center flex flex-col gap-5">
          <p className="pixel text-[7px] text-dim">// SUBMISSION RECEIVED</p>
          <p className="pixel" style={{ fontSize: "clamp(14px,3vw,24px)", color: "#FFFFFF" }}>
            REQUEST SENT.
          </p>
          <p className="mono text-sm" style={{ color: "#555555", maxWidth: 360, margin: "0 auto" }}>
            Submission received. Verification tweet will be checked.
          </p>
          <hr className="chain-border" />
          <button
            onClick={() => { setForm(INITIAL); setStatus("idle"); }}
            className="btn-outline pixel text-[7px] self-center"
          >
            SUBMIT ANOTHER
          </button>
        </div>
      </main>
    );
  }

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
        {/* Form */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Project name */}
            <div>
              <label className="pixel text-[7px] text-dim block mb-2">PROJECT NAME</label>
              <input
                type="text"
                value={form.project_name}
                onChange={update("project_name")}
                placeholder="Your project or collection name"
                maxLength={120}
                required
                style={INPUT}
              />
            </div>

            {/* Twitter handle */}
            <div>
              <label className="pixel text-[7px] text-dim block mb-2">TWITTER / X HANDLE</label>
              <input
                type="text"
                value={form.twitter_handle}
                onChange={update("twitter_handle")}
                placeholder="@yourproject"
                maxLength={32}
                required
                style={INPUT}
              />
            </div>

            {/* Wallet */}
            <div>
              <label className="pixel text-[7px] text-dim block mb-2">WALLET ADDRESS</label>
              <input
                type="text"
                value={form.wallet}
                onChange={update("wallet")}
                placeholder="0x..."
                maxLength={64}
                required
                style={INPUT}
              />
            </div>

            {/* Offering */}
            <div>
              <label className="pixel text-[7px] text-dim block mb-2">
                WHAT YOU&apos;RE OFFERING{" "}
                <span className="text-dim">({form.offering.length}/500)</span>
              </label>
              <textarea
                value={form.offering}
                onChange={update("offering")}
                placeholder="Whitelist spots, tokens, role access, etc."
                rows={4}
                maxLength={500}
                required
                style={{ ...INPUT, resize: "vertical" }}
              />
            </div>

            {/* Verification tweet */}
            <div>
              <label className="pixel text-[7px] text-dim block mb-2">VERIFICATION TWEET URL</label>
              <input
                type="text"
                value={form.verification_tweet}
                onChange={update("verification_tweet")}
                placeholder="https://x.com/yourproject/status/..."
                maxLength={256}
                required
                style={INPUT}
              />
              <p className="mono text-xs mt-1" style={{ color: "#333333" }}>
                Tweet must mention @NUMINA and describe the collab offer.
              </p>
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
              {status === "submitting" ? "SUBMITTING..." : "► SUBMIT REQUEST"}
            </button>
          </form>
        </div>

        {/* Sidebar — rules */}
        <div className="flex flex-col gap-5">
          <div className="numina-card bracketed p-5">
            <p className="pixel text-[7px] text-dim mb-4">// COLLAB RULES</p>
            <div className="flex flex-col gap-3">
              {[
                "Max 50 spots per partner",
                "Twitter verification required",
                "1x Guaranteed + 1x FCFS per winner globally",
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
                "We verify the tweet",
                "Team reviews offering",
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
        </div>
      </div>
    </main>
  );
}
