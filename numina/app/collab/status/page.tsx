"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

type CollabStatus = {
  status:          "pending" | "approved" | "rejected" | "not_found";
  spots_allocated?: number;
  wl_type?:        string | null;
  tweet_verified?: boolean;
  created_at?:     string;
};

type LookupState = "idle" | "loading" | "done" | "error";

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return iso;
  }
}

function wlLabel(wl_type: string | null | undefined): string {
  if (!wl_type) return "-";
  if (wl_type.includes(",") || wl_type.toUpperCase() === "BOTH") return "GTD + FCFS";
  return wl_type.toUpperCase();
}

// ── Result card ───────────────────────────────────────────────────────────────

function ResultCard({ handle, result }: { handle: string; result: CollabStatus }) {
  if (result.status === "not_found") {
    return (
      <div className="numina-card bracketed p-8 flex flex-col gap-5 text-center">
        <p className="pixel text-[7px] text-dim">// NOT FOUND</p>
        <p className="pixel" style={{ fontSize: "clamp(12px,2.5vw,20px)", color: "#555555" }}>
          NO SUBMISSION FOUND
        </p>
        <p className="mono text-sm" style={{ color: "#444444" }}>
          No request found for @{handle}
        </p>
        <hr className="chain-border" />
        <Link href="/collab" className="btn-amber pixel text-[7px] self-center">
          SUBMIT REQUEST
        </Link>
      </div>
    );
  }

  if (result.status === "pending") {
    return (
      <div className="numina-card bracketed p-8 flex flex-col gap-5">
        <p className="pixel text-[7px] text-dim">// SUBMISSION PENDING</p>
        <p className="pixel" style={{ fontSize: "clamp(12px,2.5vw,20px)", color: "#FFFFFF" }}>
          UNDER REVIEW.
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center" style={{ borderBottom: "1px solid #111", paddingBottom: 8 }}>
            <span className="mono text-xs" style={{ color: "#444444" }}>TWEET VERIFIED</span>
            <span className="pixel text-[7px]" style={{ color: result.tweet_verified ? "#FFFFFF" : "#444444" }}>
              {result.tweet_verified ? "✓ YES" : "✗ PENDING"}
            </span>
          </div>
          {result.created_at && (
            <div className="flex justify-between items-center" style={{ borderBottom: "1px solid #111", paddingBottom: 8 }}>
              <span className="mono text-xs" style={{ color: "#444444" }}>SUBMITTED</span>
              <span className="mono text-xs" style={{ color: "#666666" }}>{formatDate(result.created_at)}</span>
            </div>
          )}
        </div>
        <p className="mono text-xs" style={{ color: "#333333" }}>
          Your request is being reviewed. No action needed.
        </p>
      </div>
    );
  }

  if (result.status === "approved") {
    return (
      <div className="numina-card bracketed p-8 flex flex-col gap-5">
        <p className="pixel text-[7px]" style={{ color: "#FFFFFF" }}>// COLLAB APPROVED</p>
        <p className="pixel" style={{ fontSize: "clamp(12px,2.5vw,20px)", color: "#FFFFFF" }}>
          APPROVED.
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center" style={{ borderBottom: "1px solid #111", paddingBottom: 8 }}>
            <span className="mono text-xs" style={{ color: "#444444" }}>SPOTS ALLOCATED</span>
            <span className="pixel text-[9px]" style={{ color: "#FFFFFF" }}>{result.spots_allocated ?? 0}</span>
          </div>
          <div className="flex justify-between items-center" style={{ borderBottom: "1px solid #111", paddingBottom: 8 }}>
            <span className="mono text-xs" style={{ color: "#444444" }}>WL TYPE</span>
            <span className="pixel text-[7px]" style={{ color: "#FFFFFF" }}>{wlLabel(result.wl_type)}</span>
          </div>
          {result.created_at && (
            <div className="flex justify-between items-center" style={{ borderBottom: "1px solid #111", paddingBottom: 8 }}>
              <span className="mono text-xs" style={{ color: "#444444" }}>SUBMITTED</span>
              <span className="mono text-xs" style={{ color: "#666666" }}>{formatDate(result.created_at)}</span>
            </div>
          )}
        </div>
        <div className="numina-card bracketed p-4" style={{ background: "#040404" }}>
          <p className="pixel text-[7px] text-dim mb-2">// NEXT STEPS</p>
          <p className="mono text-xs" style={{ color: "#555555" }}>
            DM <span style={{ color: "#FFFFFF" }}>@NUMINA</span> on X for allocation instructions.
          </p>
        </div>
      </div>
    );
  }

  // rejected
  return (
    <div className="numina-card bracketed p-8 flex flex-col gap-5">
      <p className="pixel text-[7px] text-dim">// NOT APPROVED</p>
      <p className="pixel" style={{ fontSize: "clamp(12px,2.5vw,20px)", color: "#555555" }}>
        REQUEST DECLINED.
      </p>
      <p className="mono text-sm" style={{ color: "#444444" }}>
        Your request was not approved this time.
      </p>
      <p className="mono text-xs" style={{ color: "#333333" }}>
        Questions? DM <span style={{ color: "#FFFFFF" }}>@NUMINA</span> on X.
      </p>
    </div>
  );
}

// ── Inner component (uses useSearchParams — must be inside Suspense) ──────────

function CollabStatusInner() {
  const searchParams = useSearchParams();
  const [handle, setHandle]       = useState(searchParams.get("twitter") ?? "");
  const [state, setState]         = useState<LookupState>("idle");
  const [result, setResult]       = useState<CollabStatus | null>(null);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);
  const [lookedUp, setLookedUp]   = useState("");

  // Auto-lookup if ?twitter= is present in URL on mount
  useEffect(() => {
    const param = searchParams.get("twitter");
    if (param) {
      setHandle(param);
      lookup(param);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookup(overrideHandle?: string) {
    const h = (overrideHandle ?? handle).replace(/^@/, "").trim();
    if (!h) return;

    setState("loading");
    setErrorMsg(null);
    setResult(null);
    setLookedUp(h);

    try {
      const res  = await fetch(`/api/collab/status?twitter=${encodeURIComponent(h)}`);
      const data = await res.json() as CollabStatus;
      setResult(data);
      setState("done");
    } catch {
      setErrorMsg("Network error - please try again");
      setState("error");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    lookup();
  }

  return (
    <main className="px-6 py-16 max-w-2xl mx-auto">
      <div className="mb-10">
        <p className="pixel text-[8px] text-dim mb-3">// COLLAB STATUS</p>
        <h1 className="pixel text-[14px] text-primary leading-loose mb-4">
          CHECK YOUR REQUEST.
        </h1>
        <p className="mono text-sm" style={{ color: "#444444" }}>
          Enter your group Twitter handle to check the status of your collab request.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
        <input
          type="text"
          value={handle}
          onChange={e => { setHandle(e.target.value); setErrorMsg(null); }}
          placeholder="@yourproject"
          maxLength={32}
          style={{ ...INPUT, flex: 1 }}
        />
        <button
          type="submit"
          disabled={state === "loading" || !handle.trim()}
          className="btn-amber pixel text-[7px]"
          style={{ minWidth: 90, minHeight: 44 }}
        >
          {state === "loading" ? "..." : "LOOKUP"}
        </button>
      </form>

      {errorMsg && (
        <p className="mono text-xs mb-6" style={{ color: "#FF4444" }}>{errorMsg}</p>
      )}

      {state === "done" && result && (
        <ResultCard handle={lookedUp} result={result} />
      )}

      {state === "idle" && (
        <div className="flex flex-col gap-3 mt-4">
          <hr className="chain-border" />
          <p className="mono text-xs text-center" style={{ color: "#333333" }}>
            No request yet?{" "}
            <Link href="/collab" style={{ color: "#555555", textDecoration: "underline" }}>
              Submit one here
            </Link>
          </p>
        </div>
      )}
    </main>
  );
}

// ── Page export — wraps inner in Suspense (required for useSearchParams) ──────

export default function CollabStatusPage() {
  return (
    <Suspense fallback={
      <main className="px-6 py-16 max-w-2xl mx-auto">
        <p className="pixel text-[7px] text-dim">// LOADING...</p>
      </main>
    }>
      <CollabStatusInner />
    </Suspense>
  );
}
