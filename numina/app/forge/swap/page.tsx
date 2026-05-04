"use client";

import { useState, useEffect, useCallback } from "react";
import { ConnectAndSignIn } from "@/components/ConnectAndSignIn";
import { DIVISIONS, type DivisionKey } from "@/lib/divisions";

// ── Types ─────────────────────────────────────────────────────────────────────

type SwapListing = {
  id: string;
  offerer_wallet: string;
  division: string | null;
  tier: string | null;
  wants_division: string | null;
  created_at: string;
  expires_at: string;
};

type AgentInfo = {
  id: string;
  division: string;
  tier: string;
};

const ALL_DIVISION_KEYS: DivisionKey[] = [
  "engineering", "design", "product", "analytics", "security", "research",
  "community", "collab", "growth", "brand", "strategy", "alpha",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function timeRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "EXPIRED";
  const hrs = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function divisionLabel(key: string | null): string {
  if (!key) return "UNKNOWN";
  const d = DIVISIONS[key as DivisionKey];
  return d ? d.name.toUpperCase() : key.toUpperCase();
}

function divisionColor(key: string | null): string {
  if (!key) return "#444444";
  return DIVISIONS[key as DivisionKey]?.color ?? "#444444";
}

const TIER_COLORS: Record<string, string> = {
  recruit: "#555555",
  operator: "#888888",
  director: "#cccccc",
  prime: "#ffffff",
};

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  listing,
  onConfirm,
  onCancel,
  loading,
}: {
  listing: SwapListing;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "24px",
      }}
    >
      <div
        className="numina-card bracketed"
        style={{ background: "#040404", padding: "32px", maxWidth: 420, width: "100%" }}
      >
        <p className="pixel text-[7px] text-dim mb-5">// CONFIRM SWAP</p>

        <div className="flex flex-col gap-3 mb-6">
          <div
            style={{
              background: "#080808",
              border: "1px solid #1c1c1c",
              padding: "12px 16px",
            }}
          >
            <p className="mono text-xs" style={{ color: "#444444" }}>YOU RECEIVE</p>
            <p
              className="pixel text-[8px] mt-1"
              style={{ color: divisionColor(listing.division) }}
            >
              {divisionLabel(listing.division)}
            </p>
            {listing.tier && (
              <p
                className="mono text-xs mt-0.5"
                style={{ color: TIER_COLORS[listing.tier] ?? "#555555" }}
              >
                {listing.tier.toUpperCase()}
              </p>
            )}
          </div>

          <p className="mono text-xs text-center" style={{ color: "#333333" }}>
            your current agent goes to {truncate(listing.offerer_wallet)}
          </p>
        </div>

        <div
          style={{
            background: "#0a0a0a",
            border: "1px solid #1a1a1a",
            padding: "10px 14px",
            marginBottom: "20px",
          }}
        >
          <p className="mono text-xs" style={{ color: "#555555" }}>
            Fragments stay with you. Only division and tier move.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-ghost pixel text-[7px]"
            style={{ flex: 1 }}
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn-amber pixel text-[7px]"
            style={{ flex: 1 }}
          >
            {loading ? "SWAPPING..." : "CONFIRM SWAP"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Listing Card ──────────────────────────────────────────────────────────────

function ListingCard({
  listing,
  isOwn,
  onAccept,
  onCancel,
}: {
  listing: SwapListing;
  isOwn: boolean;
  onAccept: (l: SwapListing) => void;
  onCancel: (id: string) => void;
}) {
  return (
    <div
      className="numina-card bracketed"
      style={{
        padding: "20px",
        background: isOwn ? "#050506" : "#040404",
        borderColor: isOwn ? "#2a2a2a" : undefined,
      }}
    >
      {/* Division + Tier */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p
            className="pixel text-[8px]"
            style={{ color: divisionColor(listing.division) }}
          >
            {divisionLabel(listing.division)}
          </p>
          {listing.tier && (
            <p
              className="mono text-xs mt-0.5"
              style={{ color: TIER_COLORS[listing.tier] ?? "#555555" }}
            >
              {listing.tier.toUpperCase()}
            </p>
          )}
        </div>
        {isOwn && (
          <span className="pixel text-[7px]" style={{ color: "#444444" }}>
            YOUR LISTING
          </span>
        )}
      </div>

      {/* Wants */}
      <p className="mono text-xs mb-3" style={{ color: "#444444" }}>
        wants:{" "}
        <span style={{ color: listing.wants_division ? divisionColor(listing.wants_division) : "#555555" }}>
          {listing.wants_division ? divisionLabel(listing.wants_division) : "ANY"}
        </span>
      </p>

      {/* Meta row */}
      <div className="flex items-center justify-between gap-2">
        <p className="mono text-xs" style={{ color: "#333333" }}>
          {truncate(listing.offerer_wallet)}
        </p>
        <p className="mono text-xs" style={{ color: "#333333" }}>
          {timeRemaining(listing.expires_at)} left
        </p>
      </div>

      {/* Actions */}
      {!isOwn ? (
        <button
          onClick={() => onAccept(listing)}
          className="btn-amber pixel text-[7px] mt-4"
          style={{ width: "100%", minHeight: 44 }}
        >
          ACCEPT SWAP
        </button>
      ) : (
        <button
          onClick={() => onCancel(listing.id)}
          className="btn-ghost pixel text-[7px] mt-4"
          style={{ width: "100%", minHeight: 44 }}
        >
          CANCEL LISTING
        </button>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SwapPage() {
  const [sessionAddr, setSessionAddr] = useState<string | null>(null);
  const [listings, setListings] = useState<SwapListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  // "list" form state
  const [wantsDivision, setWantsDivision] = useState<string>("any");
  const [listing, setListing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // "accept" confirmation
  const [confirmTarget, setConfirmTarget] = useState<SwapListing | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptResult, setAcceptResult] = useState<{ division: string; tier: string } | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // cancel
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const res = await fetch("/api/forge/swap");
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings ?? []);
      }
    } finally {
      setLoadingListings(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const myListing = sessionAddr
    ? listings.find((l) => l.offerer_wallet.toLowerCase() === sessionAddr.toLowerCase()) ?? null
    : null;

  const otherListings = sessionAddr
    ? listings.filter((l) => l.offerer_wallet.toLowerCase() !== sessionAddr.toLowerCase())
    : listings;

  async function handleList() {
    if (listing) return;
    setListing(true);
    setListError(null);
    try {
      const res = await fetch("/api/forge/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "list",
          wants_division: wantsDivision === "any" ? null : wantsDivision,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setListError(data.message ?? "Failed to list agent");
      } else {
        await fetchListings();
      }
    } catch {
      setListError("Network error — please try again");
    } finally {
      setListing(false);
    }
  }

  async function handleAcceptConfirm() {
    if (!confirmTarget || accepting) return;
    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await fetch("/api/forge/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", listing_id: confirmTarget.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAcceptError(data.message ?? "Swap failed");
        setConfirmTarget(null);
      } else {
        setAcceptResult({
          division: data.your_new_agent?.division ?? confirmTarget.division ?? "",
          tier: data.your_new_agent?.tier ?? "",
        });
        setConfirmTarget(null);
        await fetchListings();
      }
    } catch {
      setAcceptError("Network error — please try again");
      setConfirmTarget(null);
    } finally {
      setAccepting(false);
    }
  }

  async function handleCancel(listingId: string) {
    if (cancelling) return;
    setCancelling(listingId);
    try {
      const res = await fetch("/api/forge/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", listing_id: listingId }),
      });
      if (res.ok) {
        await fetchListings();
      }
    } finally {
      setCancelling(null);
    }
  }

  return (
    <>
      {/* Confirm modal */}
      {confirmTarget && (
        <ConfirmModal
          listing={confirmTarget}
          onConfirm={handleAcceptConfirm}
          onCancel={() => setConfirmTarget(null)}
          loading={accepting}
        />
      )}

      <main className="px-6 py-16 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="pixel text-[8px] text-dim mb-3">// FORGE — SWAP MARKET</p>
          <h1 className="pixel text-[16px] text-primary leading-loose glitch mb-4">
            SWAP.
          </h1>
          <p className="mono text-base text-muted max-w-2xl leading-relaxed">
            Trade your pre-mint agent with another holder. Division and tier swap.
            Fragments stay with you.
          </p>

          {/* Reminder bar */}
          <div
            style={{
              marginTop: 16,
              display: "inline-block",
              background: "#080808",
              border: "1px solid #1a1a1a",
              padding: "8px 14px",
            }}
          >
            <p className="mono text-xs" style={{ color: "#555555" }}>
              Fragments stay with you. Only division and tier move.
            </p>
          </div>
        </div>

        {/* Auth bar */}
        <div className="flex justify-center mb-10">
          <ConnectAndSignIn onSessionChange={setSessionAddr} />
        </div>

        {/* Accept result banner */}
        {acceptResult && (
          <div
            className="numina-card bracketed mb-8"
            style={{ padding: "16px 20px", background: "#030803" }}
          >
            <p className="pixel text-[7px]" style={{ color: "#44aa44" }}>
              SWAP COMPLETE — you now hold{" "}
              <span style={{ color: divisionColor(acceptResult.division) }}>
                {divisionLabel(acceptResult.division)}
              </span>{" "}
              / {acceptResult.tier.toUpperCase()}
            </p>
          </div>
        )}

        {acceptError && (
          <div
            className="numina-card bracketed mb-8"
            style={{ padding: "16px 20px" }}
          >
            <p className="mono text-xs" style={{ color: "#FF4444" }}>
              {acceptError}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* ── YOUR LISTING ── */}
          <div>
            <p className="pixel text-[8px] text-dim mb-5">// YOUR LISTING</p>

            {!sessionAddr ? (
              <p className="mono text-xs" style={{ color: "#444444" }}>
                Sign in to list your agent or accept swaps.
              </p>
            ) : myListing ? (
              <ListingCard
                listing={myListing}
                isOwn
                onAccept={() => {}}
                onCancel={handleCancel}
              />
            ) : (
              <div
                className="numina-card bracketed"
                style={{ padding: "24px", background: "#040404" }}
              >
                <p className="pixel text-[7px] text-dim mb-5">// LIST YOUR AGENT</p>

                <div className="flex flex-col gap-4">
                  <div>
                    <label className="pixel text-[7px] text-dim block mb-2">
                      WANTS DIVISION
                    </label>
                    <select
                      value={wantsDivision}
                      onChange={(e) => setWantsDivision(e.target.value)}
                      className="w-full mono text-sm px-4 py-3 outline-none appearance-none"
                      style={{
                        background: "#080808",
                        border: "1px solid #222222",
                        color: "#FFFFFF",
                      }}
                    >
                      <option value="any">ANY</option>
                      {ALL_DIVISION_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {DIVISIONS[key].name.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleList}
                    disabled={listing}
                    className="btn-amber pixel text-[7px]"
                    style={{ width: "100%", minHeight: 44 }}
                  >
                    {listing ? "LISTING..." : "LIST YOUR AGENT"}
                  </button>

                  {listError && (
                    <p className="mono text-xs" style={{ color: "#FF4444" }}>
                      {listError}
                    </p>
                  )}

                  <p className="mono text-xs" style={{ color: "#333333" }}>
                    Listing expires in 72 hours. One active listing per wallet.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── OPEN LISTINGS ── */}
          <div>
            <p className="pixel text-[8px] text-dim mb-5">
              // OPEN LISTINGS{" "}
              <span style={{ color: "#444444" }}>
                ({otherListings.length})
              </span>
            </p>

            {loadingListings ? (
              <p className="pixel text-[7px] text-dim">LOADING...</p>
            ) : otherListings.length === 0 ? (
              <p className="mono text-xs" style={{ color: "#444444" }}>
                No open listings right now. Be the first to list.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {otherListings.map((l) => (
                  <ListingCard
                    key={l.id}
                    listing={l}
                    isOwn={false}
                    onAccept={sessionAddr ? setConfirmTarget : () => {}}
                    onCancel={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
