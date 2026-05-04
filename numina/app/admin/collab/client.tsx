"use client";

import { useState } from "react";

export type CollabRequest = {
  id: string;
  project_name: string;
  twitter_handle: string;
  wallet: string;
  offering: string;
  verification_tweet: string;
  status: string;
  spots_allocated: number;
  created_at: string;
};

type CardStatus = "idle" | "loading" | "done" | "error";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function CollabCard({ request }: { request: CollabRequest }) {
  const [spots, setSpots] = useState(10);
  const [cardStatus, setCardStatus] = useState<CardStatus>("idle");
  const [result, setResult] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function act(action: "approve" | "reject") {
    setCardStatus("loading");
    try {
      const res = await fetch("/api/admin/collab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          id: request.id,
          spots_allocated: action === "approve" ? spots : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed");
      setCardStatus("done");
      setResult(action === "approve" ? `APPROVED — ${spots} spots` : "REJECTED");
      setTimeout(() => setDismissed(true), 1500);
    } catch (e) {
      setCardStatus("error");
      setResult(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div
      className="numina-card bracketed"
      style={{ padding: "20px", background: "#040404", marginBottom: 16 }}
    >
      {/* Project + handle */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="pixel text-[8px]" style={{ color: "#FFFFFF" }}>
            {request.project_name}
          </p>
          <p className="mono text-xs mt-0.5" style={{ color: "#555555" }}>
            @{request.twitter_handle}
          </p>
        </div>
        <p className="mono text-xs shrink-0" style={{ color: "#333333" }}>
          {relativeTime(request.created_at)}
        </p>
      </div>

      {/* Wallet */}
      <p className="mono text-xs mb-3" style={{ color: "#444444" }}>
        {request.wallet.slice(0, 10)}...{request.wallet.slice(-6)}
      </p>

      {/* Offering */}
      <div
        style={{
          background: "#080808",
          border: "1px solid #1a1a1a",
          padding: "10px 12px",
          marginBottom: 12,
        }}
      >
        <p className="pixel text-[6px] text-dim mb-1">OFFERING</p>
        <p className="mono text-xs" style={{ color: "#888888", whiteSpace: "pre-wrap" }}>
          {request.offering}
        </p>
      </div>

      {/* Tweet link */}
      <a
        href={request.verification_tweet}
        target="_blank"
        rel="noopener noreferrer"
        className="mono text-xs"
        style={{ color: "#555555", display: "block", marginBottom: 16 }}
      >
        → view verification tweet
      </a>

      {cardStatus === "done" || cardStatus === "error" ? (
        <p
          className="pixel text-[7px]"
          style={{ color: cardStatus === "done" ? "#44aa44" : "#FF4444" }}
        >
          {result}
        </p>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          {/* Spots input */}
          <div className="flex items-center gap-2">
            <span className="pixel text-[6px] text-dim">SPOTS</span>
            <input
              type="number"
              min={1}
              max={50}
              value={spots}
              onChange={(e) => {
                const v = Math.min(50, Math.max(1, parseInt(e.target.value) || 1));
                setSpots(v);
              }}
              disabled={cardStatus === "loading"}
              style={{
                background: "#080808",
                border: "1px solid #2a2a2a",
                color: "#FFFFFF",
                padding: "6px 10px",
                fontFamily: "Courier New, Courier, monospace",
                fontSize: 12,
                width: 70,
                outline: "none",
              }}
            />
          </div>

          <button
            onClick={() => act("approve")}
            disabled={cardStatus === "loading"}
            className="btn-amber pixel text-[7px]"
            style={{ minHeight: 36, flex: 1 }}
          >
            {cardStatus === "loading" ? "..." : "APPROVE"}
          </button>

          <button
            onClick={() => act("reject")}
            disabled={cardStatus === "loading"}
            className="btn-ghost pixel text-[7px]"
            style={{ minHeight: 36, flex: 1 }}
          >
            REJECT
          </button>
        </div>
      )}
    </div>
  );
}

export function CollabClient({ requests }: { requests: CollabRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="numina-card bracketed" style={{ padding: "24px", background: "#040404" }}>
        <p className="mono text-xs" style={{ color: "#444444" }}>
          No pending collab requests.
        </p>
      </div>
    );
  }

  return (
    <div>
      {requests.map((r) => (
        <CollabCard key={r.id} request={r} />
      ))}
    </div>
  );
}
