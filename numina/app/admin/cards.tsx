"use client";

import { useState, useEffect } from "react";

// ── Shared types ───────────────────────────────────────────────────────────────

export type CampaignState = { active: boolean; message: string };
export type XHandle = { handle: string; mention: string };
export type EarnRates = {
  basicTweet: number;
  tweetWithMedia: number;
  thread3Plus: number;
  quoteTweet: number;
  reply: number;
  likeBonus100: number;
  likeBonus1000: number;
};
export type Rules = {
  minAccountAgeDays: number;
  minFollowers: number;
  minCharacters: number;
  maxTweetAgeDays: number;
  maxSubmissionsPerDay: number;
};
export type Tier = { name: string; threshold: number; reward: string | null };

export type SybilRules = {
  requireXBinding: boolean;
  maxXAccountSubmissionsPerDay: number;
  minTweetSimilarityDistance: number;
  minAccountFollowingCount: number;
  minAccountTotalTweets: number;
  blockDefaultProfileImages: boolean;
};

export type ModerationConfig = {
  manualReviewAboveTier: string | null;
  manualReviewKeywords: string[];
};

export type ForgeConfig = {
  wl_guaranteed:     number;
  wl_bonus:          number;
  daily_task_limit:  number;
  burn_carry_rate:   number;
  swap_expiry_hours: number;
  max_task_input:    number;
  collab_pool:       number;
};

export type SupplyConfig = {
  supply:     string;
  mint_price: string;
  chain:      string;
};

export type FullConfig = {
  campaign_state: CampaignState;
  x_handle: XHandle;
  earn_rates: EarnRates;
  rules: Rules;
  tiers: Tier[];
  sybil_rules?: SybilRules;
  moderation?: ModerationConfig;
  forge_config?: ForgeConfig;
  supply_config?: SupplyConfig;
};

// ── Save hook ─────────────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved" | "error";

function useSave() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function save(key: string, value: unknown): Promise<boolean> {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setStatus("error");
      return false;
    }
  }

  return { status, error, save };
}

// ── Shared input styles ────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  background: "#080808",
  border: "1px solid #2a2a2a",
  color: "#FFFFFF",
  padding: "8px 12px",
  fontFamily: "Courier New, Courier, monospace",
  fontSize: 12,
  width: "100%",
  outline: "none",
};

const LABEL: React.CSSProperties = {
  fontFamily: "Courier New, Courier, monospace",
  fontSize: 11,
  color: "#555555",
  display: "block",
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span style={LABEL}>{label}</span>
      {children}
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

function AdminCard({
  title,
  children,
  onSave,
  saveLabel,
  saveStatus,
  saveError,
  helper,
}: {
  title: string;
  children: React.ReactNode;
  onSave: () => void;
  saveLabel: string;
  saveStatus: SaveStatus;
  saveError: string | null;
  helper?: string;
}) {
  return (
    <div
      className="numina-card bracketed"
      style={{ padding: "24px", background: "#040404" }}
    >
      <p className="pixel text-[7px] text-dim mb-6">{title}</p>
      <div className="flex flex-col gap-4">{children}</div>
      <div className="mt-6 flex flex-col gap-2">
        <button
          onClick={onSave}
          disabled={saveStatus === "saving" || saveStatus === "saved"}
          className="btn-amber pixel text-[7px]"
          style={{ width: "100%" }}
        >
          {saveStatus === "saving"
            ? "SAVING..."
            : saveStatus === "saved"
            ? "SAVED ✓"
            : saveLabel}
        </button>
        {saveStatus === "error" && saveError && (
          <p className="mono text-xs" style={{ color: "#FF4444" }}>
            {saveError}
          </p>
        )}
        {helper && (
          <p className="mono text-xs" style={{ color: "#444444" }}>
            {helper}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Card 1: Campaign State ────────────────────────────────────────────────────

export function CampaignStateCard({ initial }: { initial: CampaignState }) {
  const [cs, setCs] = useState<CampaignState>(initial);
  const { status, error, save } = useSave();

  function toggle() {
    const msg = cs.active
      ? "Pause campaign? /points will return to STANDBY."
      : "Activate campaign? This will make /points live for all users.";
    if (window.confirm(msg)) {
      setCs((prev) => ({ ...prev, active: !prev.active }));
    }
  }

  return (
    <AdminCard
      title="// CAMPAIGN STATE"
      saveLabel="UPDATE CAMPAIGN"
      saveStatus={status}
      saveError={error}
      onSave={() => save("campaign_state", cs)}
    >
      <Field label="Active">
        <div className="flex items-center gap-4 mt-1">
          <button
            onClick={toggle}
            className={cs.active ? "btn-amber pixel text-[7px]" : "btn-outline pixel text-[7px]"}
          >
            {cs.active ? "● ACTIVE" : "○ STANDBY"}
          </button>
          <span className="mono text-xs" style={{ color: "#444444" }}>
            {cs.active
              ? "/points is live for all users"
              : "/points shows STANDBY screen"}
          </span>
        </div>
      </Field>

      <Field label="Status message (shown when inactive)">
        <textarea
          value={cs.message}
          onChange={(e) => setCs((prev) => ({ ...prev, message: e.target.value }))}
          rows={2}
          style={{ ...INPUT, resize: "vertical" }}
        />
      </Field>
    </AdminCard>
  );
}

// ── Card 2: X Handle ─────────────────────────────────────────────────────────

export function XHandleCard({ initial }: { initial: XHandle }) {
  const [xh, setXh] = useState<XHandle>(initial);
  const { status, error, save } = useSave();

  function validate() {
    if (!xh.handle.trim()) return "Handle cannot be empty";
    if (!xh.mention.trim()) return "Mention cannot be empty";
    return null;
  }

  function handleSave() {
    const err = validate();
    if (err) { alert(err); return; }
    save("x_handle", xh);
  }

  return (
    <AdminCard
      title="// X HANDLE"
      saveLabel="UPDATE HANDLE"
      saveStatus={status}
      saveError={error}
      onSave={handleSave}
      helper="This is the handle users must mention in tweets to earn points."
    >
      <Field label="Handle (no @)">
        <input
          type="text"
          value={xh.handle}
          onChange={(e) => setXh((prev) => ({ ...prev, handle: e.target.value }))}
          style={INPUT}
          placeholder="numinagenesis"
        />
      </Field>
      <Field label="Mention (with @)">
        <input
          type="text"
          value={xh.mention}
          onChange={(e) => setXh((prev) => ({ ...prev, mention: e.target.value }))}
          style={INPUT}
          placeholder="@numinagenesis"
        />
      </Field>
    </AdminCard>
  );
}

// ── Card 3: Earn Rates ────────────────────────────────────────────────────────

const EARN_FIELDS: { key: keyof EarnRates; label: string }[] = [
  { key: "basicTweet",      label: "Basic Tweet" },
  { key: "tweetWithMedia",  label: "Tweet With Media" },
  { key: "thread3Plus",     label: "Thread (3+ tweets)" },
  { key: "quoteTweet",      label: "Quote Tweet" },
  { key: "reply",           label: "Reply" },
  { key: "likeBonus100",    label: "Like Bonus (100+ likes)" },
  { key: "likeBonus1000",   label: "Like Bonus (1000+ likes)" },
];

export function EarnRatesCard({ initial }: { initial: EarnRates }) {
  const [er, setEr] = useState<EarnRates>(initial);
  const { status, error, save } = useSave();

  function update(key: keyof EarnRates, raw: string) {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n >= 0) setEr((prev) => ({ ...prev, [key]: n }));
  }

  return (
    <AdminCard
      title="// EARN RATES"
      saveLabel="UPDATE RATES"
      saveStatus={status}
      saveError={error}
      onSave={() => save("earn_rates", er)}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {EARN_FIELDS.map(({ key, label }) => (
          <Field key={key} label={label}>
            <input
              type="number"
              min={0}
              value={er[key]}
              onChange={(e) => update(key, e.target.value)}
              style={INPUT}
            />
          </Field>
        ))}
      </div>
    </AdminCard>
  );
}

// ── Card 4: Rules ─────────────────────────────────────────────────────────────

const RULES_FIELDS: { key: keyof Rules; label: string }[] = [
  { key: "minAccountAgeDays",    label: "Min Account Age (days)" },
  { key: "minFollowers",         label: "Min Followers" },
  { key: "minCharacters",        label: "Min Tweet Characters" },
  { key: "maxTweetAgeDays",      label: "Max Tweet Age (days)" },
  { key: "maxSubmissionsPerDay", label: "Max Submissions Per Day" },
];

export function RulesCard({ initial }: { initial: Rules }) {
  const [rules, setRules] = useState<Rules>(initial);
  const { status, error, save } = useSave();

  function update(key: keyof Rules, raw: string) {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n >= 0) setRules((prev) => ({ ...prev, [key]: n }));
  }

  return (
    <AdminCard
      title="// ANTI-ABUSE RULES"
      saveLabel="UPDATE RULES"
      saveStatus={status}
      saveError={error}
      onSave={() => save("rules", rules)}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {RULES_FIELDS.map(({ key, label }) => (
          <Field key={key} label={label}>
            <input
              type="number"
              min={0}
              value={rules[key]}
              onChange={(e) => update(key, e.target.value)}
              style={INPUT}
            />
          </Field>
        ))}
      </div>
    </AdminCard>
  );
}

// ── Card 5: Tiers ─────────────────────────────────────────────────────────────

const REWARD_OPTIONS = ["", "WL_BASIC", "WL_GUARANTEED", "WL_FREE_MINT"];

type TierRow = Tier & { isNew?: boolean };

export function TiersCard({ initial }: { initial: Tier[] }) {
  const [tiers, setTiers] = useState<TierRow[]>(
    initial.map((t) => ({ ...t }))
  );
  const { status, error, save } = useSave();

  function updateTier(i: number, field: keyof Tier, value: string | number | null) {
    setTiers((prev) =>
      prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t))
    );
  }

  function addTier() {
    setTiers((prev) => [
      ...prev,
      { name: "", threshold: 0, reward: null, isNew: true },
    ]);
  }

  function removeTier(i: number) {
    setTiers((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    const invalid = tiers.find((t) => t.isNew && !t.name.trim());
    if (invalid) { alert("New tier name cannot be empty"); return; }
    const invalid2 = tiers.find((t) => t.threshold < 0);
    if (invalid2) { alert("Threshold must be >= 0"); return; }
    // Strip internal isNew flag before saving
    save("tiers", tiers.map(({ name, threshold, reward }) => ({ name, threshold, reward })));
  }

  return (
    <AdminCard
      title="// TIER THRESHOLDS"
      saveLabel="UPDATE TIERS"
      saveStatus={status}
      saveError={error}
      onSave={handleSave}
    >
      <div className="flex flex-col gap-3">
        {tiers.map((tier, i) => (
          <div
            key={i}
            className="flex flex-col sm:flex-row gap-2 items-start sm:items-center"
            style={{
              padding: "10px 12px",
              background: "#080808",
              border: "1px solid #1a1a1a",
            }}
          >
            {/* Name */}
            <div style={{ minWidth: 120 }}>
              {tier.isNew ? (
                <input
                  type="text"
                  value={tier.name}
                  onChange={(e) => updateTier(i, "name", e.target.value)}
                  placeholder="TIER NAME"
                  style={{ ...INPUT, width: 120 }}
                />
              ) : (
                <span
                  className="pixel text-[7px] text-primary"
                  style={{ minWidth: 120, display: "inline-block" }}
                >
                  {tier.name}
                </span>
              )}
            </div>

            {/* Threshold */}
            <div className="flex items-center gap-2">
              <span style={{ ...LABEL, marginBottom: 0 }}>pts</span>
              <input
                type="number"
                min={0}
                value={tier.threshold}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!Number.isNaN(n) && n >= 0) updateTier(i, "threshold", n);
                }}
                style={{ ...INPUT, width: 90 }}
              />
            </div>

            {/* Reward */}
            <div className="flex items-center gap-2 flex-1">
              <span style={{ ...LABEL, marginBottom: 0 }}>reward</span>
              <select
                value={tier.reward ?? ""}
                onChange={(e) =>
                  updateTier(i, "reward", e.target.value || null)
                }
                style={{
                  ...INPUT,
                  width: "auto",
                  flex: 1,
                  cursor: "pointer",
                }}
              >
                {REWARD_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt || "[None]"}
                  </option>
                ))}
              </select>
            </div>

            {/* Remove button — only if not first row */}
            {i > 0 && (
              <button
                onClick={() => removeTier(i)}
                className="mono text-xs"
                style={{
                  background: "none",
                  border: "none",
                  color: "#555555",
                  cursor: "pointer",
                  padding: "4px 8px",
                  flexShrink: 0,
                }}
                title="Remove tier"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addTier}
        className="btn-ghost pixel text-[7px] mt-2"
        style={{ width: "100%" }}
      >
        + ADD TIER
      </button>
    </AdminCard>
  );
}

// ── Card 6: Sybil Rules ───────────────────────────────────────────────────────

const SYBIL_DEFAULTS: SybilRules = {
  requireXBinding: false,
  maxXAccountSubmissionsPerDay: 3,
  minTweetSimilarityDistance: 0.7,
  minAccountFollowingCount: 0,
  minAccountTotalTweets: 0,
  blockDefaultProfileImages: false,
};

export function SybilRulesCard({ initial }: { initial?: SybilRules }) {
  const [sr, setSr] = useState<SybilRules>(initial ?? { ...SYBIL_DEFAULTS });
  const { status, error, save } = useSave();

  function updateNum(key: keyof SybilRules, raw: string) {
    const n = parseFloat(raw);
    if (!Number.isNaN(n) && n >= 0) setSr((prev) => ({ ...prev, [key]: n }));
  }

  return (
    <AdminCard
      title="// SYBIL PROTECTION"
      saveLabel="UPDATE SYBIL RULES"
      saveStatus={status}
      saveError={error}
      onSave={() => save("sybil_rules", sr)}
      helper="Changes take effect within 30s (config cache TTL)."
    >
      {/* X Account Binding */}
      <Field label="Require X Account Binding">
        <div className="flex items-center gap-4 mt-1">
          <button
            onClick={() => setSr((prev) => ({ ...prev, requireXBinding: !prev.requireXBinding }))}
            className={sr.requireXBinding ? "btn-amber pixel text-[7px]" : "btn-outline pixel text-[7px]"}
          >
            {sr.requireXBinding ? "● ENABLED" : "○ DISABLED"}
          </button>
          <span className="mono text-xs" style={{ color: "#444444" }}>
            {sr.requireXBinding
              ? "Users must bind X account before submitting"
              : "Binding optional — submissions accepted from any account"}
          </span>
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Max X Account Submissions / Day">
          <input
            type="number"
            min={0}
            value={sr.maxXAccountSubmissionsPerDay}
            onChange={(e) => updateNum("maxXAccountSubmissionsPerDay", e.target.value)}
            style={INPUT}
          />
        </Field>

        <Field label="Min Tweet Similarity Distance (0–1)">
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={sr.minTweetSimilarityDistance}
            onChange={(e) => updateNum("minTweetSimilarityDistance", e.target.value)}
            style={INPUT}
          />
        </Field>

        <Field label="Min Account Following Count">
          <input
            type="number"
            min={0}
            value={sr.minAccountFollowingCount}
            onChange={(e) => updateNum("minAccountFollowingCount", e.target.value)}
            style={INPUT}
          />
        </Field>

        <Field label="Min Account Total Tweets">
          <input
            type="number"
            min={0}
            value={sr.minAccountTotalTweets}
            onChange={(e) => updateNum("minAccountTotalTweets", e.target.value)}
            style={INPUT}
          />
        </Field>
      </div>

      {/* Block default profile images */}
      <Field label="Block Default Profile Images">
        <div className="flex items-center gap-4 mt-1">
          <button
            onClick={() => setSr((prev) => ({ ...prev, blockDefaultProfileImages: !prev.blockDefaultProfileImages }))}
            className={sr.blockDefaultProfileImages ? "btn-amber pixel text-[7px]" : "btn-outline pixel text-[7px]"}
          >
            {sr.blockDefaultProfileImages ? "● ENABLED" : "○ DISABLED"}
          </button>
          <span className="mono text-xs" style={{ color: "#444444" }}>
            {sr.blockDefaultProfileImages
              ? "Accounts without custom avatar are rejected"
              : "Default profile images allowed"}
          </span>
        </div>
      </Field>
    </AdminCard>
  );
}

// ── Card 7: Wallet Tools ──────────────────────────────────────────────────────

type UnbindStatus = "idle" | "loading" | "done" | "error";

export function WalletToolsCard() {
  const [address, setAddress] = useState("");
  const [unbindStatus, setUnbindStatus] = useState<UnbindStatus>("idle");
  const [unbindMsg, setUnbindMsg] = useState<string | null>(null);

  async function handleUnbind() {
    const addr = address.trim().toLowerCase();
    if (!addr) { alert("Enter a wallet address first"); return; }
    if (!window.confirm(`Unbind X account from ${addr}?`)) return;

    setUnbindStatus("loading");
    setUnbindMsg(null);
    try {
      const res = await fetch("/api/admin/unbind-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: addr }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setUnbindStatus("done");
      setUnbindMsg(`X binding cleared for ${addr}`);
    } catch (e) {
      setUnbindStatus("error");
      setUnbindMsg(e instanceof Error ? e.message : "Unknown error");
    }
  }

  return (
    <div
      className="numina-card bracketed"
      style={{ padding: "24px", background: "#040404" }}
    >
      <p className="pixel text-[7px] text-dim mb-6">// WALLET TOOLS</p>

      <div className="flex flex-col gap-4">
        {/* Unbind X account */}
        <Field label="Wallet Address">
          <input
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setUnbindStatus("idle");
              setUnbindMsg(null);
            }}
            placeholder="0x..."
            style={INPUT}
          />
        </Field>

        <button
          onClick={handleUnbind}
          disabled={unbindStatus === "loading"}
          className="btn-ghost pixel text-[7px]"
          style={{ width: "100%" }}
        >
          {unbindStatus === "loading" ? "PROCESSING..." : "UNBIND X ACCOUNT"}
        </button>

        {unbindMsg && (
          <p
            className="mono text-xs"
            style={{ color: unbindStatus === "done" ? "#44aa44" : "#FF4444" }}
          >
            {unbindMsg}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Card 9: Collab Queue ──────────────────────────────────────────────────────

type CollabStatus = "loading" | "ready" | "error";

export function CollabQueueCard() {
  const [count, setCount] = useState<number | null>(null);
  const [queueStatus, setQueueStatus] = useState<CollabStatus>("loading");

  useEffect(() => {
    fetch("/api/collab")
      .then((r) => r.json())
      .then((d) => { setCount(d.count ?? 0); setQueueStatus("ready"); })
      .catch(() => setQueueStatus("error"));
  }, []);

  return (
    <div className="numina-card bracketed" style={{ padding: "24px", background: "#040404" }}>
      <p className="pixel text-[7px] text-dim mb-5">// COLLAB QUEUE</p>
      <div className="flex flex-col gap-4">
        {queueStatus === "loading" && (
          <p className="pixel text-[7px] text-dim">LOADING...</p>
        )}
        {queueStatus === "error" && (
          <p className="mono text-xs" style={{ color: "#FF4444" }}>Failed to load count.</p>
        )}
        {queueStatus === "ready" && (
          <p className="mono text-xs" style={{ color: (count ?? 0) > 0 ? "#aaaa44" : "#444444" }}>
            {count} pending collab request{count !== 1 ? "s" : ""}
          </p>
        )}
        <a
          href="/admin/collab"
          className="btn-ghost pixel text-[7px]"
          style={{ textAlign: "center", textDecoration: "none", display: "block", padding: "10px 0" }}
        >
          → VIEW COLLAB QUEUE
        </a>
      </div>
    </div>
  );
}

// ── Card 10: Raffle ───────────────────────────────────────────────────────────

type RaffleAction = "idle" | "populating" | "drawing" | "error";

type RaffleStatus = {
  eligible_count: number;
  entry_count: number;
  last_winner: string | null;
};

export function RaffleCard() {
  const [raffleStatus, setRaffleStatus] = useState<RaffleStatus | null>(null);
  const [action, setAction] = useState<RaffleAction>("idle");
  const [lastWinner, setLastWinner] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { fetchStatus(); }, []);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/raffle?action=status");
      if (res.ok) setRaffleStatus(await res.json());
    } catch { /* non-critical */ }
  }

  async function populate() {
    if (action !== "idle") return;
    setAction("populating");
    setMsg(null);
    try {
      const res = await fetch("/api/raffle?action=populate");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed");
      setMsg(`Inserted ${data.inserted} wallets into raffle.`);
      await fetchStatus();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Populate failed");
    } finally {
      setAction("idle");
    }
  }

  async function draw() {
    if (action !== "idle") return;
    if (!window.confirm("Draw a winner now? This cannot be undone.")) return;
    setAction("drawing");
    setMsg(null);
    try {
      const res = await fetch("/api/raffle?action=draw");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed");
      setLastWinner(data.winner_wallet);
      setMsg(null);
      await fetchStatus();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Draw failed");
    } finally {
      setAction("idle");
    }
  }

  const winner = lastWinner ?? raffleStatus?.last_winner ?? null;

  return (
    <div className="numina-card bracketed" style={{ padding: "24px", background: "#040404" }}>
      <p className="pixel text-[7px] text-dim mb-5">// RAFFLE</p>
      <div className="flex flex-col gap-4">
        {raffleStatus && (
          <div className="flex flex-col gap-1">
            <p className="mono text-xs" style={{ color: "#555555" }}>
              Eligible wallets:{" "}
              <span style={{ color: "#FFFFFF" }}>{raffleStatus.eligible_count}</span>
            </p>
            <p className="mono text-xs" style={{ color: "#555555" }}>
              Entries in raffle:{" "}
              <span style={{ color: "#FFFFFF" }}>{raffleStatus.entry_count}</span>
            </p>
          </div>
        )}

        {winner && (
          <div
            style={{
              background: "#080808",
              border: "1px solid #2a2a2a",
              padding: "10px 14px",
            }}
          >
            <p className="pixel text-[6px] text-dim mb-1">LAST WINNER</p>
            <p className="mono text-xs" style={{ color: "#44aa44" }}>
              {winner.slice(0, 10)}...{winner.slice(-6)}
            </p>
          </div>
        )}

        {msg && (
          <p className="mono text-xs" style={{ color: "#888888" }}>
            {msg}
          </p>
        )}

        <button
          onClick={populate}
          disabled={action !== "idle"}
          className="btn-ghost pixel text-[7px]"
          style={{ width: "100%" }}
        >
          {action === "populating" ? "POPULATING..." : "POPULATE RAFFLE"}
        </button>

        <button
          onClick={draw}
          disabled={action !== "idle"}
          className="btn-amber pixel text-[7px]"
          style={{ width: "100%" }}
        >
          {action === "drawing" ? "DRAWING..." : "DRAW WINNER"}
        </button>
      </div>
    </div>
  );
}

// ── Card 8: Moderation ────────────────────────────────────────────────────────


const MOD_DEFAULTS: ModerationConfig = {
  manualReviewAboveTier: null,
  manualReviewKeywords: [],
};

const TIER_OPTIONS = ["BRONZE", "SILVER", "GOLD", "DIAMOND"] as const;

export function ModerationCard({ initial }: { initial?: ModerationConfig }) {
  const [mc, setMc] = useState<ModerationConfig>(initial ?? { ...MOD_DEFAULTS });
  // Keywords stored as newline-separated text for easy editing
  const [kwText, setKwText] = useState(
    (initial?.manualReviewKeywords ?? []).join("\n")
  );
  const { status, error, save } = useSave();

  function handleSave() {
    const keywords = kwText
      .split("\n")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    save("moderation", { ...mc, manualReviewKeywords: keywords });
  }

  return (
    <AdminCard
      title="// MODERATION"
      saveLabel="UPDATE MODERATION"
      saveStatus={status}
      saveError={error}
      onSave={handleSave}
      helper="null = all submissions auto-approve (default). Keywords are case-insensitive."
    >
      {/* Manual review tier threshold */}
      <Field label="Manual Review Above Tier">
        <select
          value={mc.manualReviewAboveTier ?? ""}
          onChange={(e) =>
            setMc((prev) => ({
              ...prev,
              manualReviewAboveTier: e.target.value || null,
            }))
          }
          style={{ ...INPUT, cursor: "pointer" }}
        >
          <option value="">Disabled — auto-approve all</option>
          {TIER_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t} and above → pending review
            </option>
          ))}
        </select>
      </Field>

      {/* Keyword list */}
      <Field label="Manual Review Keywords (one per line, case-insensitive)">
        <textarea
          value={kwText}
          onChange={(e) => setKwText(e.target.value)}
          rows={4}
          placeholder={"airdrop\nfree mint\nwen"}
          style={{ ...INPUT, resize: "vertical" }}
        />
      </Field>
    </AdminCard>
  );
}

// ── Card 9: Forge Config ──────────────────────────────────────────────────────

const FORGE_DEFAULTS: ForgeConfig = {
  wl_guaranteed:     500,
  wl_bonus:          1000,
  daily_task_limit:  10,
  burn_carry_rate:   0.5,
  swap_expiry_hours: 72,
  max_task_input:    200,
  collab_pool:       888,
};

export function ForgeConfigCard({ initial }: { initial?: ForgeConfig }) {
  const [cfg, setCfg] = useState<ForgeConfig>(initial ?? { ...FORGE_DEFAULTS });
  const { status, error, save } = useSave();

  // burn_carry_rate stored as 0–1, edited as 0–100
  const carryPct = Math.round(cfg.burn_carry_rate * 100);

  function setNum(key: keyof ForgeConfig, raw: string) {
    const n = Number(raw);
    if (!isNaN(n)) setCfg((prev) => ({ ...prev, [key]: n }));
  }

  return (
    <AdminCard
      title="// FORGE CONFIG"
      saveLabel="UPDATE FORGE CONFIG"
      saveStatus={status}
      saveError={error}
      onSave={() => save("forge_config", cfg)}
      helper="WL thresholds are fragment counts. burn_carry_rate: 0–100% of fragments kept after burn."
    >
      <Field label="WL Guaranteed Threshold (fragments)">
        <input
          type="number"
          value={cfg.wl_guaranteed}
          onChange={(e) => setNum("wl_guaranteed", e.target.value)}
          style={INPUT}
        />
      </Field>
      <Field label="WL Bonus Pool (fragments)">
        <input
          type="number"
          value={cfg.wl_bonus}
          onChange={(e) => setNum("wl_bonus", e.target.value)}
          style={INPUT}
        />
      </Field>
      <Field label="Daily Task Limit (tasks/day per wallet)">
        <input
          type="number"
          value={cfg.daily_task_limit}
          onChange={(e) => setNum("daily_task_limit", e.target.value)}
          style={INPUT}
        />
      </Field>
      <Field label={`Burn Carry Rate (${carryPct}% of fragments kept)`}>
        <input
          type="number"
          min={0}
          max={100}
          value={carryPct}
          onChange={(e) =>
            setCfg((prev) => ({
              ...prev,
              burn_carry_rate: Math.min(100, Math.max(0, Number(e.target.value))) / 100,
            }))
          }
          style={INPUT}
        />
      </Field>
      <Field label="Swap Expiry Hours">
        <input
          type="number"
          value={cfg.swap_expiry_hours}
          onChange={(e) => setNum("swap_expiry_hours", e.target.value)}
          style={INPUT}
        />
      </Field>
      <Field label="Max Task Input Length (chars)">
        <input
          type="number"
          value={cfg.max_task_input}
          onChange={(e) => setNum("max_task_input", e.target.value)}
          style={INPUT}
        />
      </Field>
      <Field label="Collab Pool Size">
        <input
          type="number"
          value={cfg.collab_pool}
          onChange={(e) => setNum("collab_pool", e.target.value)}
          style={INPUT}
        />
      </Field>
    </AdminCard>
  );
}

// ── Card 10: Supply Config ────────────────────────────────────────────────────

const SUPPLY_DEFAULTS: SupplyConfig = {
  supply:     "TBA",
  mint_price: "TBA",
  chain:      "Ethereum",
};

export function SupplyConfigCard({ initial }: { initial?: SupplyConfig }) {
  const [cfg, setCfg] = useState<SupplyConfig>(initial ?? { ...SUPPLY_DEFAULTS });
  const { status, error, save } = useSave();

  function setStr(key: keyof SupplyConfig, val: string) {
    setCfg((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <AdminCard
      title="// SUPPLY CONFIG"
      saveLabel="UPDATE SUPPLY CONFIG"
      saveStatus={status}
      saveError={error}
      onSave={() => save("supply_config", cfg)}
      helper="Displayed on /mint and /docs. Use 'TBA' until values are confirmed."
    >
      <Field label="Supply">
        <input
          type="text"
          value={cfg.supply}
          onChange={(e) => setStr("supply", e.target.value)}
          placeholder="4444"
          style={INPUT}
        />
      </Field>
      <Field label="Mint Price">
        <input
          type="text"
          value={cfg.mint_price}
          onChange={(e) => setStr("mint_price", e.target.value)}
          placeholder="0.05 ETH"
          style={INPUT}
        />
      </Field>
      <Field label="Chain">
        <input
          type="text"
          value={cfg.chain}
          onChange={(e) => setStr("chain", e.target.value)}
          placeholder="Ethereum"
          style={INPUT}
        />
      </Field>
    </AdminCard>
  );
}
