"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type TweetAuthor = { screen_name?: string };
type RawData = { text?: string; author?: TweetAuthor } | null;

export type PendingSubmission = {
  id: string;
  wallet_address: string;
  tweet_url: string;
  points_awarded: number;
  created_at: string;
  raw_data: RawData;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ── MetaRow ───────────────────────────────────────────────────────────────────

function MetaRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <span
        className="pixel"
        style={{
          fontSize: 6,
          color: "#444444",
          display: "block",
          marginBottom: 2,
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      <span className="mono text-xs" style={{ color: accent ? "#FFFFFF" : "#888888" }}>
        {value}
      </span>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const TEXTAREA_BASE: React.CSSProperties = {
  background: "#080808",
  color: "#FFFFFF",
  padding: "8px 12px",
  fontFamily: "Courier New, Courier, monospace",
  fontSize: 12,
  resize: "vertical",
  outline: "none",
  width: "100%",
};

// ── QueueClient ───────────────────────────────────────────────────────────────

export function QueueClient({
  submissions: initial,
}: {
  submissions: PendingSubmission[];
}) {
  const [submissions, setSubmissions] = useState<PendingSubmission[]>(initial);
  // Per-card state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function moderate(
    id: string,
    act: "approve" | "reject",
    reason?: string
  ) {
    setLoading((prev) => ({ ...prev, [id]: true }));
    setErrors((prev) => ({ ...prev, [id]: "" }));

    try {
      const res = await fetch("/api/admin/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: act, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");

      // Remove card from list on success
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      if (rejectingId === id) {
        setRejectingId(null);
        setReasons((prev) => { const n = { ...prev }; delete n[id]; return n; });
      }
    } catch (e) {
      setErrors((prev) => ({
        ...prev,
        [id]: e instanceof Error ? e.message : "Unknown error",
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }));
    }
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (submissions.length === 0) {
    return (
      <div
        className="numina-card bracketed"
        style={{ padding: "40px 24px", textAlign: "center", background: "#040404" }}
      >
        <p className="pixel text-[7px] text-dim mb-3">// QUEUE CLEAR</p>
        <p className="mono text-xs" style={{ color: "#444444" }}>
          No submissions pending review.
        </p>
      </div>
    );
  }

  // ── Submission cards ──────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {submissions.map((sub) => {
        const isRejecting = rejectingId === sub.id;
        const isLoading   = loading[sub.id] ?? false;
        const errorMsg    = errors[sub.id] ?? "";
        const rawData     = sub.raw_data as { text?: string; author?: { screen_name?: string } } | null;
        const tweetText   = rawData?.text ?? "";
        const xHandle     = rawData?.author?.screen_name ?? "";

        return (
          <div
            key={sub.id}
            className="numina-card bracketed"
            style={{ padding: "20px 24px", background: "#040404" }}
          >
            {/* ── Card header ── */}
            <div
              className="flex items-start justify-between mb-4 flex-wrap gap-2"
            >
              <p className="pixel text-[7px] text-dim">// PENDING SUBMISSION</p>
              <span className="mono text-xs" style={{ color: "#333333" }}>
                {relativeTime(sub.created_at)}
              </span>
            </div>

            {/* ── Metadata grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <MetaRow
                label="WALLET"
                value={truncateAddress(sub.wallet_address)}
              />
              {xHandle && (
                <MetaRow label="X ACCOUNT" value={`@${xHandle}`} />
              )}
              <MetaRow
                label="PENDING PTS"
                value={String(sub.points_awarded)}
                accent
              />
            </div>

            {/* ── Tweet text ── */}
            {tweetText && (
              <div
                style={{
                  background: "#080808",
                  border: "1px solid #1a1a1a",
                  padding: "12px 14px",
                  marginBottom: 16,
                }}
              >
                <p
                  className="mono text-xs"
                  style={{ color: "#666666", lineHeight: 1.65, wordBreak: "break-word" }}
                >
                  {tweetText}
                </p>
              </div>
            )}

            {/* ── Primary action row ── */}
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={sub.tweet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost pixel text-[7px]"
                style={{ textDecoration: "none" }}
              >
                → VIEW TWEET
              </a>

              {!isRejecting && (
                <>
                  <button
                    onClick={() => moderate(sub.id, "approve")}
                    disabled={isLoading}
                    className="pixel text-[7px]"
                    style={{
                      border: "1px solid #44aa44",
                      color: isLoading ? "#336633" : "#44aa44",
                      background: "none",
                      padding: "8px 16px",
                      cursor: isLoading ? "not-allowed" : "pointer",
                      minHeight: 36,
                    }}
                  >
                    {isLoading ? "..." : "APPROVE"}
                  </button>

                  <button
                    onClick={() => setRejectingId(sub.id)}
                    disabled={isLoading}
                    className="pixel text-[7px]"
                    style={{
                      border: "1px solid #aa4444",
                      color: "#aa4444",
                      background: "none",
                      padding: "8px 16px",
                      cursor: isLoading ? "not-allowed" : "pointer",
                      minHeight: 36,
                    }}
                  >
                    REJECT
                  </button>
                </>
              )}
            </div>

            {/* ── Reject flow ── */}
            {isRejecting && (
              <div className="flex flex-col gap-2 mt-4">
                <textarea
                  value={reasons[sub.id] ?? ""}
                  onChange={(e) =>
                    setReasons((prev) => ({ ...prev, [sub.id]: e.target.value }))
                  }
                  placeholder="Rejection reason (required)..."
                  rows={2}
                  style={{
                    ...TEXTAREA_BASE,
                    border: "1px solid #aa4444",
                  }}
                />

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() =>
                      moderate(sub.id, "reject", reasons[sub.id])
                    }
                    disabled={isLoading || !reasons[sub.id]?.trim()}
                    className="pixel text-[7px]"
                    style={{
                      border: "1px solid #aa4444",
                      color: isLoading || !reasons[sub.id]?.trim() ? "#663333" : "#aa4444",
                      background: "none",
                      padding: "8px 16px",
                      cursor:
                        isLoading || !reasons[sub.id]?.trim()
                          ? "not-allowed"
                          : "pointer",
                      minHeight: 36,
                    }}
                  >
                    {isLoading ? "..." : "CONFIRM REJECT"}
                  </button>

                  <button
                    onClick={() => {
                      setRejectingId(null);
                      setErrors((prev) => ({ ...prev, [sub.id]: "" }));
                    }}
                    className="pixel text-[7px]"
                    style={{
                      border: "1px solid #2a2a2a",
                      color: "#555555",
                      background: "none",
                      padding: "8px 16px",
                      cursor: "pointer",
                      minHeight: 36,
                    }}
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}

            {/* ── Error ── */}
            {errorMsg && (
              <p className="mono text-xs mt-3" style={{ color: "#FF4444" }}>
                {errorMsg}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
