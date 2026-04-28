export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { CSSProperties } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { calculateTier, type TierConfig } from "@/lib/tier-calc";

// ── Types ─────────────────────────────────────────────────────────────────────

type LeaderboardRow = {
  address: string;
  total_points: number;
  submission_count: number;
  bound_x_handle: string | null;
  first_seen_at: string | null;
};

type StatRow = {
  total_points: number;
  submission_count: number;
  bound_x_id: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const TIER_COLORS: Record<string, string> = {
  BRONZE:  "#a87050",
  SILVER:  "#888888",
  GOLD:    "#b89040",
  DIAMOND: "#88aabf",
};

function tierColor(name: string): string {
  return TIER_COLORS[name.toUpperCase()] ?? "#555555";
}

async function getConfigValue<T>(key: string, fallback: T): Promise<T> {
  const { data } = await supabase
    .from("config")
    .select("value")
    .eq("key", key)
    .single();
  return data ? (data.value as T) : fallback;
}

// ── Shared table header style ─────────────────────────────────────────────────

const TH: CSSProperties = {
  color: "#444444",
  fontWeight: "normal",
  padding: "8px 12px",
  textAlign: "left",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LeaderboardPage() {
  // Parallel fetches — stats query (all wallets), table query (top 100), tiers
  const [statsResult, tableResult, tiers] = await Promise.all([
    supabase
      .from("wallets")
      .select("total_points, submission_count, bound_x_id")
      .eq("banned", false),
    supabase
      .from("wallets")
      .select("address, total_points, submission_count, bound_x_handle, first_seen_at")
      .eq("banned", false)
      .order("total_points", { ascending: false })
      .order("submission_count", { ascending: false })
      .order("first_seen_at", { ascending: true })
      .limit(100),
    getConfigValue<TierConfig[]>("tiers", []),
  ]);

  const allWallets = (statsResult.data ?? []) as StatRow[];
  const topWallets = (tableResult.data ?? []) as LeaderboardRow[];

  // ── Aggregate stats ───────────────────────────────────────────────────────

  const totalPoints     = allWallets.reduce((s, w) => s + (w.total_points    ?? 0), 0);
  const totalSubs       = allWallets.reduce((s, w) => s + (w.submission_count ?? 0), 0);
  const participants    = allWallets.filter(w => (w.total_points    ?? 0) > 0).length;
  const xBoundCount     = allWallets.filter(w =>  w.bound_x_id != null).length;

  // ── Tier breakdown (participants only) ────────────────────────────────────

  const sortedTiers = [...tiers].sort((a, b) => b.threshold - a.threshold);
  const tierCounts: Record<string, number> = {};
  let unrankedCount = 0;

  for (const w of allWallets) {
    if ((w.total_points ?? 0) <= 0) continue;
    const tier = calculateTier(w.total_points ?? 0, tiers);
    if (tier) {
      const key = tier.name.toUpperCase();
      tierCounts[key] = (tierCounts[key] ?? 0) + 1;
    } else {
      unrankedCount++;
    }
  }

  const showTierBreakdown = tiers.length > 0 && participants > 0;
  const hasRows = topWallets.length > 0;

  // ── Stats cells ───────────────────────────────────────────────────────────

  const STATS = [
    { label: "TOTAL POINTS",  value: totalPoints.toLocaleString()  },
    { label: "SUBMISSIONS",   value: totalSubs.toLocaleString()     },
    { label: "PARTICIPANTS",  value: participants.toLocaleString()  },
    { label: "X BOUND",       value: xBoundCount.toLocaleString()  },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="px-4 sm:px-6 py-12 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="mb-10">
        <p className="pixel text-[7px] text-dim mb-2">
          // NUMINA POINTS LEADERBOARD
        </p>
        <p className="mono text-xs" style={{ color: "#444444" }}>
          Top contributors. Updated live.
        </p>
      </div>

      {/* ── Stats grid ── */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 mb-8"
        style={{ border: "1px solid #1a1a1a", gap: 1, background: "#1a1a1a" }}
      >
        {STATS.map(({ label, value }) => (
          <div key={label} style={{ background: "#040404", padding: "16px 20px" }}>
            <p
              className="pixel"
              style={{
                fontSize: "clamp(16px, 2.5vw, 26px)",
                color: "#FFFFFF",
                lineHeight: 1,
              }}
            >
              {value}
            </p>
            <p
              className="mono"
              style={{ fontSize: 10, color: "#444444", marginTop: 4 }}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Tier breakdown ── */}
      {showTierBreakdown && (
        <p className="mono text-xs mb-8" style={{ color: "#333333" }}>
          {sortedTiers.map((t, i) => (
            <span key={t.name}>
              {i > 0 && <span style={{ color: "#222222" }}> · </span>}
              <span style={{ color: tierColor(t.name) }}>
                {tierCounts[t.name.toUpperCase()] ?? 0} {t.name.toUpperCase()}
              </span>
            </span>
          ))}
          {unrankedCount > 0 && (
            <>
              <span style={{ color: "#222222" }}> · </span>
              <span>{unrankedCount} UNRANKED</span>
            </>
          )}
        </p>
      )}

      {/* ── Divider ── */}
      <div className="flex items-center gap-4 mb-6">
        <hr className="chain-border flex-1" />
        <span className="pixel text-[7px] text-dim">TOP 100</span>
        <hr className="chain-border flex-1" />
      </div>

      {/* ── Empty state ── */}
      {!hasRows ? (
        <div
          className="numina-card bracketed"
          style={{ padding: "48px 24px", textAlign: "center", background: "#040404" }}
        >
          <p className="pixel text-[7px] text-dim mb-4">
            // LEADERBOARD STANDING BY
          </p>
          <p className="mono text-xs mb-6" style={{ color: "#444444" }}>
            No submissions yet. Be the first.
          </p>
          <Link href="/points" className="btn-amber pixel text-[7px]">
            EARN POINTS
          </Link>
        </div>
      ) : (
        <>
          {/* ── Table ── */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 320,
              }}
            >
              <colgroup>
                <col style={{ width: 44 }} />   {/* RANK */}
                <col />                          {/* WALLET */}
                <col style={{ width: 140 }} />   {/* BOUND X */}
                <col style={{ width: 110 }} />   {/* SUBMISSIONS */}
                <col style={{ width: 90 }} />    {/* TIER */}
                <col style={{ width: 100 }} />   {/* POINTS */}
              </colgroup>

              <thead>
                <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                  <th className="pixel text-[6px]" style={TH}>#</th>
                  <th className="pixel text-[6px]" style={TH}>WALLET</th>
                  <th
                    className="hidden sm:table-cell pixel text-[6px]"
                    style={TH}
                  >
                    BOUND X
                  </th>
                  <th
                    className="hidden sm:table-cell pixel text-[6px]"
                    style={{ ...TH, textAlign: "right" }}
                  >
                    SUBMISSIONS
                  </th>
                  <th
                    className="hidden sm:table-cell pixel text-[6px]"
                    style={TH}
                  >
                    TIER
                  </th>
                  <th
                    className="pixel text-[6px]"
                    style={{ ...TH, textAlign: "right" }}
                  >
                    POINTS
                  </th>
                </tr>
              </thead>

              <tbody>
                {topWallets.map((wallet, i) => {
                  const rank   = i + 1;
                  const isTop3 = rank <= 3;
                  const tier   = calculateTier(wallet.total_points ?? 0, tiers);

                  const rankColor =
                    rank === 1 ? "#FFFFFF" :
                    rank === 2 ? "#aaaaaa" :
                    rank === 3 ? "#777777" :
                                 "#444444";

                  const addrColor  = isTop3 ? "#cccccc" : "#888888";
                  const pointColor =
                    rank === 1 ? "#FFFFFF" :
                    rank <= 3  ? "#aaaaaa" :
                                 "#666666";

                  return (
                    <tr
                      key={wallet.address}
                      className="hover:bg-white/[0.025] transition-colors"
                      style={{ borderBottom: "1px solid #0d0d0d" }}
                    >
                      {/* ── Rank ── */}
                      <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                        <span
                          className="pixel"
                          style={{ color: rankColor, fontSize: isTop3 ? 13 : 9 }}
                        >
                          {rank}
                        </span>
                      </td>

                      {/* ── Wallet + mobile tier ── */}
                      <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                        <div className="flex flex-col" style={{ gap: 2 }}>
                          <span
                            className="mono text-xs"
                            style={{ color: addrColor }}
                          >
                            {truncateAddress(wallet.address)}
                          </span>
                          {/* Tier badge — visible on mobile only (sm: hidden) */}
                          {tier && (
                            <span
                              className="sm:hidden pixel"
                              style={{ fontSize: 6, color: tierColor(tier.name) }}
                            >
                              {tier.name.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ── Bound X — desktop only ── */}
                      <td
                        className="hidden sm:table-cell"
                        style={{ padding: "10px 12px", verticalAlign: "middle" }}
                      >
                        {wallet.bound_x_handle ? (
                          <span
                            className="mono text-xs"
                            style={{ color: "#555555" }}
                          >
                            @{wallet.bound_x_handle}
                          </span>
                        ) : (
                          <span
                            className="mono text-xs"
                            style={{ color: "#252525" }}
                          >
                            —
                          </span>
                        )}
                      </td>

                      {/* ── Submissions — desktop only ── */}
                      <td
                        className="hidden sm:table-cell"
                        style={{
                          padding: "10px 12px",
                          verticalAlign: "middle",
                          textAlign: "right",
                        }}
                      >
                        <span className="mono text-xs" style={{ color: "#444444" }}>
                          {(wallet.submission_count ?? 0).toLocaleString()}
                        </span>
                      </td>

                      {/* ── Tier badge — desktop only ── */}
                      <td
                        className="hidden sm:table-cell"
                        style={{ padding: "10px 12px", verticalAlign: "middle" }}
                      >
                        {tier ? (
                          <span
                            className="pixel"
                            style={{ fontSize: 7, color: tierColor(tier.name) }}
                          >
                            {tier.name.toUpperCase()}
                          </span>
                        ) : (
                          <span
                            className="mono text-xs"
                            style={{ color: "#252525" }}
                          >
                            —
                          </span>
                        )}
                      </td>

                      {/* ── Points ── */}
                      <td
                        style={{
                          padding: "10px 12px",
                          verticalAlign: "middle",
                          textAlign: "right",
                        }}
                      >
                        <span
                          className="pixel"
                          style={{
                            fontSize: isTop3 ? 11 : 9,
                            color: pointColor,
                          }}
                        >
                          {(wallet.total_points ?? 0).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Footer note ── */}
          <p
            className="mono text-xs mt-4 text-center"
            style={{ color: "#252525" }}
          >
            Showing top {topWallets.length} of{" "}
            {participants.toLocaleString()} participants
          </p>
        </>
      )}
    </main>
  );
}
