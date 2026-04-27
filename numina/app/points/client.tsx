"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ConnectAndSignIn } from "@/components/ConnectAndSignIn";

// ── Types ─────────────────────────────────────────────────────────────────────

type TierConfig = {
  name: string;
  threshold: number;
  reward: string | null;
};

type RecentSubmission = {
  id: string;
  tweetUrl: string;
  status: "pending" | "approved" | "rejected";
  pointsAwarded: number;
  createdAt: string;
  rejectionNote: string | null;
};

type StandingData = {
  totalPoints: number;
  tier: TierConfig | null;
  nextTier: TierConfig | null;
  progress: number;
  submissionCount: number;
  banned: boolean;
  recent: RecentSubmission[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function truncateUrl(url: string, max = 42): string {
  return url.length > max ? url.slice(0, max) + "…" : url;
}

const ERROR_MAP: Record<string, string> = {
  invalid_url: "Not a valid tweet URL",
  duplicate: "Already submitted",
  rate_limit: "Daily submission limit reached",
  banned: "Wallet banned",
  fetch_failed: "Could not load tweet — please try again",
  campaign_inactive: "Campaign is paused",
};

function friendlyError(code: string, serverMessage?: string): string {
  // For rule violations, the server message is precise — use it.
  const ruleViolation = new Set([
    "account_too_new",
    "low_followers",
    "tweet_too_old",
    "too_short",
    "no_mention",
  ]);
  if (ruleViolation.has(code) && serverMessage) return serverMessage;
  return ERROR_MAP[code] ?? serverMessage ?? "Something went wrong";
}

// ── Tier badge ────────────────────────────────────────────────────────────────

const TIER_STYLES: Record<string, React.CSSProperties> = {
  BRONZE:  { color: "#a87050" },
  SILVER:  { color: "#888888" },
  GOLD:    { color: "#b89040" },
  DIAMOND: { color: "#88aabf" },
};

function TierBadge({ name }: { name: string }) {
  const style = TIER_STYLES[name.toUpperCase()] ?? { color: "#555555" };
  return (
    <span className="pixel text-[7px]" style={style}>
      {name.toUpperCase()}
    </span>
  );
}

// ── Status dot ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  approved: "#44aa44",
  pending:  "#aaaa44",
  rejected: "#aa4444",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#555555";
  return (
    <span className="mono text-xs" style={{ color }}>
      ● {status.toUpperCase()}
    </span>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      style={{
        height: 1,
        background: "#1c1c1c",
        width: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: "100%",
          width: `${pct}%`,
          background: "#FFFFFF",
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

// ── Submit card ───────────────────────────────────────────────────────────────

function SubmitCard({
  xHandle,
  onSuccess,
}: {
  xHandle: string;
  onSuccess: () => void;
}) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    if (!url.trim() || submitting) return;
    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/submissions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweetUrl: url.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setSuccessMsg(`+${data.pointsAwarded} POINTS AWARDED`);
        setUrl("");
        inputRef.current?.focus();
        onSuccess();
      } else {
        setErrorMsg(friendlyError(data.code, data.message));
      }
    } catch {
      setErrorMsg("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSubmit();
  }

  return (
    <div
      className="numina-card bracketed"
      style={{ padding: "24px", background: "#040404" }}
    >
      <p className="pixel text-[7px] text-dim mb-4">// SUBMIT WORK</p>
      <p className="mono text-xs mb-5" style={{ color: "#555555" }}>
        Mention{" "}
        <span style={{ color: "#FFFFFF" }}>@{xHandle}</span>
        {" "}in your tweet, then paste the link below.
      </p>

      <div className="flex flex-col gap-3">
        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setSuccessMsg(null);
            setErrorMsg(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="https://x.com/yourhandle/status/..."
          disabled={submitting}
          style={{
            background: "#080808",
            border: "1px solid #2a2a2a",
            color: "#FFFFFF",
            padding: "10px 12px",
            fontFamily: "Courier New, Courier, monospace",
            fontSize: 12,
            width: "100%",
            outline: "none",
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={submitting || !url.trim()}
          className="btn-amber pixel text-[7px]"
          style={{ width: "100%" }}
        >
          {submitting ? "VALIDATING..." : "SUBMIT"}
        </button>

        {successMsg && (
          <p className="pixel text-[7px]" style={{ color: "#44aa44" }}>
            {successMsg}
          </p>
        )}
        {errorMsg && (
          <p className="mono text-xs" style={{ color: "#FF4444" }}>
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Standing card ─────────────────────────────────────────────────────────────

function StandingCard({
  data,
  loading,
}: {
  data: StandingData | null;
  loading: boolean;
}) {
  return (
    <div
      className="numina-card bracketed"
      style={{ padding: "24px", background: "#040404" }}
    >
      <p className="pixel text-[7px] text-dim mb-6">// YOUR STANDING</p>

      {loading || !data ? (
        <p className="pixel text-[7px] text-dim">LOADING...</p>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Points + tier */}
          <div>
            <p
              className="pixel"
              style={{ fontSize: "clamp(28px, 6vw, 48px)", color: "#FFFFFF", lineHeight: 1 }}
            >
              {data.totalPoints.toLocaleString()}
            </p>
            <p className="mono text-xs mt-1" style={{ color: "#444444" }}>
              points
            </p>
            <div className="mt-2">
              {data.tier ? (
                <TierBadge name={data.tier.name} />
              ) : (
                <span className="pixel text-[7px]" style={{ color: "#444444" }}>
                  — NO TIER YET
                </span>
              )}
            </div>
          </div>

          {/* Progress to next tier */}
          <div className="flex flex-col gap-2">
            <ProgressBar value={data.progress} />
            <p className="mono text-xs" style={{ color: "#444444" }}>
              {data.nextTier
                ? `${(data.nextTier.threshold - data.totalPoints).toLocaleString()} pts to ${data.nextTier.name.toUpperCase()}`
                : "MAX TIER"}
            </p>
          </div>

          {/* Submission count */}
          <p className="mono text-xs" style={{ color: "#444444" }}>
            Total submissions: {data.submissionCount}
          </p>

          {/* Recent list */}
          <div className="flex flex-col gap-0">
            <div
              style={{
                borderTop: "1px solid #1a1a1a",
                marginBottom: 12,
                marginTop: 4,
              }}
            />
            {data.recent.length === 0 ? (
              <p className="mono text-xs" style={{ color: "#444444" }}>
                No submissions yet.
              </p>
            ) : (
              data.recent.map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "8px 16px",
                    padding: "8px 0",
                    borderBottom: "1px solid #111111",
                  }}
                >
                  {/* URL */}
                  <a
                    href={sub.tweetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono text-xs"
                    style={{
                      color: "#555555",
                      textDecoration: "none",
                      flex: "1 1 180px",
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={sub.tweetUrl}
                  >
                    {truncateUrl(sub.tweetUrl)}
                  </a>

                  {/* Status + points + time */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexShrink: 0,
                    }}
                  >
                    <StatusBadge status={sub.status} />
                    <span
                      className="pixel text-[7px]"
                      style={{ color: "#888888" }}
                    >
                      +{sub.pointsAwarded}
                    </span>
                    <span
                      className="mono text-xs"
                      style={{ color: "#333333" }}
                    >
                      {relativeTime(sub.createdAt)}
                    </span>
                  </div>

                  {/* Rejection note (if any) */}
                  {sub.rejectionNote && (
                    <p
                      className="mono text-xs w-full"
                      style={{ color: "#664444" }}
                    >
                      {sub.rejectionNote}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root client component ─────────────────────────────────────────────────────

interface Props {
  xHandle: string;
}

export function PointsClient({ xHandle }: Props) {
  const [sessionAddr, setSessionAddr] = useState<string | null>(null);
  const [standing, setStanding] = useState<StandingData | null>(null);
  const [standingLoading, setStandingLoading] = useState(false);

  const fetchStanding = useCallback(async () => {
    setStandingLoading(true);
    try {
      const res = await fetch("/api/submissions/me");
      if (res.ok) setStanding(await res.json());
    } finally {
      setStandingLoading(false);
    }
  }, []);

  // Fetch standing whenever the user signs in
  useEffect(() => {
    if (sessionAddr) fetchStanding();
    else setStanding(null);
  }, [sessionAddr, fetchStanding]);

  return (
    <div className="flex flex-col gap-6">
      {/* Auth bar — always shown */}
      <div className="flex justify-center">
        <ConnectAndSignIn onSessionChange={setSessionAddr} />
      </div>

      {/* STATE B — signed out */}
      {!sessionAddr && (
        <p
          className="mono text-xs text-center"
          style={{ color: "#444444" }}
        >
          Connect wallet and post about NUMINA on X to earn points.
        </p>
      )}

      {/* STATE C — signed in */}
      {sessionAddr && (
        <>
          <SubmitCard xHandle={xHandle} onSuccess={fetchStanding} />
          <StandingCard data={standing} loading={standingLoading} />
        </>
      )}
    </div>
  );
}
