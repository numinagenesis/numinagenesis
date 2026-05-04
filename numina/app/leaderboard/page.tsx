export const dynamic  = "force-dynamic";
export const revalidate = 0;

import type { CSSProperties } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { calculateTier, type TierConfig } from "@/lib/tier-calc";
import { DIVISIONS, TIERS, type DivisionKey, type TierKey } from "@/lib/divisions";
import { WL_THRESHOLD } from "@/lib/supabase-forge";

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

type FragRow = {
  wallet: string;
  balance: number;
};

type AgentRow = {
  wallet: string;
  division: string;
  tier: string;
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

function wlStatus(balance: number): { label: string; color: string } {
  if (balance >= WL_THRESHOLD * 2) return { label: "GUARANTEED", color: "#FFFFFF" };
  if (balance >= WL_THRESHOLD)     return { label: "QUALIFIED",  color: "#888888" };
  return                                  { label: "PENDING",    color: "#333333" };
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const TH: CSSProperties = {
  color: "#444444",
  fontWeight: "normal",
  padding: "8px 12px",
  textAlign: "left",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
};

// ── Tab bar ───────────────────────────────────────────────────────────────────

function TabBar({ active }: { active: "points" | "fragments" }) {
  const tabs = [
    { key: "fragments", label: "// FRAGMENTS", href: "/leaderboard"           },
    { key: "points",    label: "// POINTS",    href: "/leaderboard?tab=points" },
  ] as const;

  return (
    <div className="flex" style={{ borderBottom: "1px solid #1a1a1a", marginBottom: 32 }}>
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className="pixel text-[7px] px-5 py-3"
          style={{
            textDecoration: "none",
            borderBottom:   active === tab.key ? "2px solid #FFFFFF" : "2px solid transparent",
            color:          active === tab.key ? "#FFFFFF" : "#444444",
            marginBottom:   -1,
          }}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const activeTab = searchParams.tab === "points" ? "points" : "fragments";

  // ── POINTS tab ────────────────────────────────────────────────────────────

  if (activeTab === "points") {
    const [statsResult, tableResult, tiers] = await Promise.all([
      supabase.from("wallets").select("total_points, submission_count, bound_x_id").eq("banned", false),
      supabase
        .from("wallets")
        .select("address, total_points, submission_count, bound_x_handle, first_seen_at")
        .eq("banned", false)
        .order("total_points",     { ascending: false })
        .order("submission_count", { ascending: false })
        .order("first_seen_at",    { ascending: true  })
        .limit(100),
      getConfigValue<TierConfig[]>("tiers", []),
    ]);

    const allWallets = (statsResult.data ?? []) as StatRow[];
    const topWallets = (tableResult.data ?? []) as LeaderboardRow[];

    const totalPoints  = allWallets.reduce((s, w) => s + (w.total_points    ?? 0), 0);
    const totalSubs    = allWallets.reduce((s, w) => s + (w.submission_count ?? 0), 0);
    const participants = allWallets.filter(w => (w.total_points    ?? 0) > 0).length;
    const xBoundCount  = allWallets.filter(w =>  w.bound_x_id != null).length;

    const sortedTiers = [...tiers].sort((a, b) => b.threshold - a.threshold);
    const tierCounts: Record<string, number> = {};
    let unrankedCount = 0;
    for (const w of allWallets) {
      if ((w.total_points ?? 0) <= 0) continue;
      const tier = calculateTier(w.total_points ?? 0, tiers);
      if (tier) { const k = tier.name.toUpperCase(); tierCounts[k] = (tierCounts[k] ?? 0) + 1; }
      else       { unrankedCount++; }
    }

    const STATS = [
      { label: "TOTAL POINTS", value: totalPoints.toLocaleString()  },
      { label: "SUBMISSIONS",  value: totalSubs.toLocaleString()    },
      { label: "PARTICIPANTS", value: participants.toLocaleString() },
      { label: "X BOUND",      value: xBoundCount.toLocaleString() },
    ];

    const hasRows = topWallets.length > 0;

    return (
      <main className="px-4 sm:px-6 py-12 max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="pixel text-[7px] text-dim mb-2">// NUMINA LEADERBOARD</p>
          <p className="mono text-xs" style={{ color: "#444444" }}>Top contributors. Updated live.</p>
        </div>

        <TabBar active="points" />

        {/* Stats grid */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 mb-8"
          style={{ border: "1px solid #1a1a1a", gap: 1, background: "#1a1a1a" }}
        >
          {STATS.map(({ label, value }) => (
            <div key={label} style={{ background: "#040404", padding: "16px 20px" }}>
              <p className="pixel" style={{ fontSize: "clamp(16px, 2.5vw, 26px)", color: "#FFFFFF", lineHeight: 1 }}>{value}</p>
              <p className="mono" style={{ fontSize: 10, color: "#444444", marginTop: 4 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Tier breakdown */}
        {tiers.length > 0 && participants > 0 && (
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

        <div className="flex items-center gap-4 mb-6">
          <hr className="chain-border flex-1" />
          <span className="pixel text-[7px] text-dim">TOP 100</span>
          <hr className="chain-border flex-1" />
        </div>

        {!hasRows ? (
          <div className="numina-card bracketed" style={{ padding: "48px 24px", textAlign: "center", background: "#040404" }}>
            <p className="pixel text-[7px] text-dim mb-4">// LEADERBOARD STANDING BY</p>
            <p className="mono text-xs mb-6" style={{ color: "#444444" }}>No submissions yet. Be the first.</p>
            <Link href="/points" className="btn-amber pixel text-[7px]">EARN POINTS</Link>
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 320 }}>
                <colgroup>
                  <col style={{ width: 44 }} />
                  <col />
                  <col style={{ width: 140 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 100 }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                    <th className="pixel text-[6px]" style={TH}>#</th>
                    <th className="pixel text-[6px]" style={TH}>WALLET</th>
                    <th className="hidden sm:table-cell pixel text-[6px]" style={TH}>BOUND X</th>
                    <th className="hidden sm:table-cell pixel text-[6px]" style={{ ...TH, textAlign: "right" }}>SUBMISSIONS</th>
                    <th className="hidden sm:table-cell pixel text-[6px]" style={TH}>TIER</th>
                    <th className="pixel text-[6px]" style={{ ...TH, textAlign: "right" }}>POINTS</th>
                  </tr>
                </thead>
                <tbody>
                  {topWallets.map((wallet, i) => {
                    const rank   = i + 1;
                    const isTop3 = rank <= 3;
                    const tier   = calculateTier(wallet.total_points ?? 0, tiers);
                    const rankColor  = rank === 1 ? "#FFFFFF" : rank === 2 ? "#aaaaaa" : rank === 3 ? "#777777" : "#444444";
                    const addrColor  = isTop3 ? "#cccccc" : "#888888";
                    const pointColor = rank === 1 ? "#FFFFFF" : rank <= 3 ? "#aaaaaa" : "#666666";
                    return (
                      <tr
                        key={wallet.address}
                        className="hover:bg-white/[0.025] transition-colors"
                        style={{ borderBottom: "1px solid #0d0d0d" }}
                      >
                        <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                          <span className="pixel" style={{ color: rankColor, fontSize: isTop3 ? 13 : 9 }}>{rank}</span>
                        </td>
                        <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                          <div className="flex flex-col" style={{ gap: 2 }}>
                            <span className="mono text-xs" style={{ color: addrColor }}>{truncateAddress(wallet.address)}</span>
                            {tier && (
                              <span className="sm:hidden pixel" style={{ fontSize: 6, color: tierColor(tier.name) }}>
                                {tier.name.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="hidden sm:table-cell" style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                          {wallet.bound_x_handle
                            ? <span className="mono text-xs" style={{ color: "#555555" }}>@{wallet.bound_x_handle}</span>
                            : <span className="mono text-xs" style={{ color: "#252525" }}>—</span>}
                        </td>
                        <td className="hidden sm:table-cell" style={{ padding: "10px 12px", verticalAlign: "middle", textAlign: "right" }}>
                          <span className="mono text-xs" style={{ color: "#444444" }}>
                            {(wallet.submission_count ?? 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell" style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                          {tier
                            ? <span className="pixel" style={{ fontSize: 7, color: tierColor(tier.name) }}>{tier.name.toUpperCase()}</span>
                            : <span className="mono text-xs" style={{ color: "#252525" }}>—</span>}
                        </td>
                        <td style={{ padding: "10px 12px", verticalAlign: "middle", textAlign: "right" }}>
                          <span className="pixel" style={{ fontSize: isTop3 ? 11 : 9, color: pointColor }}>
                            {(wallet.total_points ?? 0).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mono text-xs mt-4 text-center" style={{ color: "#252525" }}>
              Showing top {topWallets.length} of {participants.toLocaleString()} participants
            </p>
          </>
        )}
      </main>
    );
  }

  // ── FRAGMENTS tab (default) ───────────────────────────────────────────────

  const [fragAllResult, fragTopResult] = await Promise.all([
    supabase.from("soul_fragments").select("wallet, balance"),
    supabase
      .from("soul_fragments")
      .select("wallet, balance")
      .order("balance", { ascending: false })
      .limit(100),
  ]);

  const fragAll = (fragAllResult.data ?? []) as FragRow[];
  const fragTop = (fragTopResult.data ?? []) as FragRow[];

  // Fetch active agents for top 100 wallets to get division + tier
  let agents: AgentRow[] = [];
  const topWalletAddrs = fragTop.map(r => r.wallet);
  if (topWalletAddrs.length > 0) {
    const { data } = await supabase
      .from("pre_mint_agents")
      .select("wallet, division, tier")
      .in("wallet", topWalletAddrs)
      .eq("is_active", true);
    agents = (data ?? []) as AgentRow[];
  }

  const agentMap = new Map(agents.map(a => [a.wallet, a]));

  // Aggregate stats
  const totalParticipants = fragAll.filter(r => (r.balance ?? 0) > 0).length;
  const totalFragments    = fragAll.reduce((s, r) => s + (r.balance ?? 0), 0);
  const walletsQualified  = fragAll.filter(r => (r.balance ?? 0) >= WL_THRESHOLD).length;
  const walletsGuaranteed = fragAll.filter(r => (r.balance ?? 0) >= WL_THRESHOLD * 2).length;

  const FRAG_STATS = [
    { label: "PARTICIPANTS", value: totalParticipants.toLocaleString()  },
    { label: "TOTAL FRAGS",  value: totalFragments.toLocaleString()     },
    { label: "QUALIFIED",    value: walletsQualified.toLocaleString()   },
    { label: "GUARANTEED",   value: walletsGuaranteed.toLocaleString()  },
  ];

  return (
    <main className="px-4 sm:px-6 py-12 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="pixel text-[7px] text-dim mb-2">// NUMINA LEADERBOARD</p>
        <p className="mono text-xs" style={{ color: "#444444" }}>Soul fragment rankings. Updated live.</p>
      </div>

      <TabBar active="fragments" />

      {/* Stats grid */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 mb-8"
        style={{ border: "1px solid #1a1a1a", gap: 1, background: "#1a1a1a" }}
      >
        {FRAG_STATS.map(({ label, value }) => (
          <div key={label} style={{ background: "#040404", padding: "16px 20px" }}>
            <p className="pixel" style={{ fontSize: "clamp(16px, 2.5vw, 26px)", color: "#FFFFFF", lineHeight: 1 }}>{value}</p>
            <p className="mono" style={{ fontSize: 10, color: "#444444", marginTop: 4 }}>{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mb-6">
        <hr className="chain-border flex-1" />
        <span className="pixel text-[7px] text-dim">TOP 100 — WL ZONE</span>
        <hr className="chain-border flex-1" />
      </div>

      {fragTop.length === 0 ? (
        <div
          className="numina-card bracketed"
          style={{ padding: "48px 24px", textAlign: "center", background: "#040404" }}
        >
          <p className="pixel text-[7px] text-dim mb-4">// RANKINGS STANDING BY</p>
          <p className="mono text-xs mb-6" style={{ color: "#444444" }}>No forge activity yet. Be the first.</p>
          <Link href="/forge" className="btn-amber pixel text-[7px]">OPEN FORGE</Link>
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 360 }}>
              <colgroup>
                <col style={{ width: 44 }} />
                <col />
                <col style={{ width: 130 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 120 }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                  <th className="pixel text-[6px]" style={TH}>#</th>
                  <th className="pixel text-[6px]" style={TH}>WALLET</th>
                  <th className="hidden sm:table-cell pixel text-[6px]" style={TH}>DIVISION</th>
                  <th className="hidden sm:table-cell pixel text-[6px]" style={TH}>TIER</th>
                  <th className="pixel text-[6px]" style={{ ...TH, textAlign: "right" }}>FRAGMENTS</th>
                  <th className="hidden sm:table-cell pixel text-[6px]" style={{ ...TH, textAlign: "right" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {fragTop.map((row, i) => {
                  const rank      = i + 1;
                  const isTop3    = rank <= 3;
                  const inWLZone  = rank <= 50;
                  const agent     = agentMap.get(row.wallet);
                  const div       = agent ? DIVISIONS[agent.division as DivisionKey] : null;
                  const agentTier = agent ? TIERS[agent.tier as TierKey]             : null;
                  const { label: wlLabel, color: wlColor } = wlStatus(row.balance ?? 0);

                  const rankColor = rank === 1 ? "#FFFFFF" : rank === 2 ? "#aaaaaa" : rank === 3 ? "#777777" : "#444444";
                  const addrColor = isTop3 ? "#cccccc" : inWLZone ? "#888888" : "#555555";
                  const fragColor = rank === 1 ? "#FFFFFF" : rank <= 3 ? "#aaaaaa" : inWLZone ? "#666666" : "#444444";

                  return (
                    <tr
                      key={row.wallet}
                      className="hover:bg-white/[0.025] transition-colors"
                      style={{
                        borderBottom: "1px solid #0d0d0d",
                        background:   inWLZone ? "rgba(255,255,255,0.015)" : "transparent",
                      }}
                    >
                      {/* Rank */}
                      <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                        <span className="pixel" style={{ color: rankColor, fontSize: isTop3 ? 13 : 9 }}>{rank}</span>
                      </td>

                      {/* Wallet + mobile division */}
                      <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                        <div className="flex flex-col" style={{ gap: 2 }}>
                          <span className="mono text-xs" style={{ color: addrColor }}>
                            {truncateAddress(row.wallet)}
                          </span>
                          {div && (
                            <span className="sm:hidden pixel" style={{ fontSize: 6, color: div.color }}>
                              {div.name.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Division — desktop */}
                      <td className="hidden sm:table-cell" style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                        {div
                          ? <span className="pixel" style={{ fontSize: 7, color: div.color }}>{div.name.toUpperCase()}</span>
                          : <span className="mono text-xs" style={{ color: "#252525" }}>—</span>}
                      </td>

                      {/* Tier — desktop */}
                      <td className="hidden sm:table-cell" style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                        {agentTier
                          ? <span className="pixel" style={{ fontSize: 7, color: "#666666" }}>{agentTier.name.toUpperCase()}</span>
                          : <span className="mono text-xs" style={{ color: "#252525" }}>—</span>}
                      </td>

                      {/* Fragments */}
                      <td style={{ padding: "10px 12px", verticalAlign: "middle", textAlign: "right" }}>
                        <div className="flex flex-col items-end" style={{ gap: 1 }}>
                          <span className="pixel" style={{ fontSize: isTop3 ? 11 : 9, color: fragColor }}>
                            {(row.balance ?? 0).toLocaleString()}
                          </span>
                          <span className="mono" style={{ fontSize: 8, color: "#2a2a2a" }}>
                            / {WL_THRESHOLD}
                          </span>
                        </div>
                      </td>

                      {/* WL status — desktop */}
                      <td
                        className="hidden sm:table-cell"
                        style={{ padding: "10px 12px", verticalAlign: "middle", textAlign: "right" }}
                      >
                        <span className="pixel" style={{ fontSize: 7, color: wlColor }}>● {wlLabel}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mono text-xs mt-4 text-center" style={{ color: "#252525" }}>
            Top 50 rows in WL zone · {fragTop.length} of {totalParticipants.toLocaleString()} forgers shown
          </p>
        </>
      )}
    </main>
  );
}
