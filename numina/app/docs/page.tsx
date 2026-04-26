import Link from "next/link";

// ── Data ──────────────────────────────────────────────────────────────────────

const BUILDER_DIVS = [
  {
    name: "THE ARCHITECT",
    desc: "Your systems designer. Plans how things should be built — smart contracts, app structure, technical decisions.",
  },
  {
    name: "THE CIPHER",
    desc: "Your security guy. Reviews code for bugs and exploits. Catches what shouldn't ship.",
  },
  {
    name: "THE ORACLE",
    desc: "Your researcher. Reads the whitepapers, the docs, the deep stuff. Comes back with what matters.",
  },
  {
    name: "THE ANALYST",
    desc: "Your data person. Pulls numbers, reads charts, on-chain analytics. Tells you what's actually happening.",
  },
  {
    name: "THE NAVIGATOR",
    desc: "Your product strategist. Maps the user journey, picks priorities, figures out what to build next.",
  },
  {
    name: "THE ARTISAN",
    desc: "Your designer. Crafts how it looks and feels. Visual identity, interfaces, the polish.",
  },
];

const COMMUNITY_DIVS = [
  {
    name: "THE GHOST",
    desc: "Your on-chain watcher. Tracks whales, mempool, suspicious moves. Sees what hides in the noise.",
  },
  {
    name: "THE HERALD",
    desc: "Your communicator. Drafts announcements, threads, posts. Speaks for the work.",
  },
  {
    name: "THE WEAVER",
    desc: "Your connector. Maps relationships between people, projects, protocols. Finds collaboration where you missed it.",
  },
  {
    name: "THE CATALYST",
    desc: "Your growth person. Plans launches, activations, ignition moments. Knows how to start fires.",
  },
  {
    name: "THE SIGNAL",
    desc: "Your marketer. Cuts through noise, picks the right channels, controls the message.",
  },
  {
    name: "THE STRATEGIST",
    desc: "Your long-game thinker. Plans three moves ahead. Resource allocation, positioning, the cold calls.",
  },
];

const TIERS = [
  { name: "RECRUIT",      rarity: "common",    desc: "straight answers, no fluff" },
  { name: "OPERATOR",     rarity: "uncommon",  desc: "structured, multi-step" },
  { name: "DIRECTOR",     rarity: "rare",      desc: "full analysis, frameworks" },
  { name: "NUMINA PRIME", rarity: "legendary", desc: "peer-level, shapes decisions" },
];

const TIER_SPLIT = [
  { name: "RECRUIT",      count: "2,666", pct: "60%" },
  { name: "OPERATOR",     count: "1,111", pct: "25%" },
  { name: "DIRECTOR",     count: "533",   pct: "12%" },
  { name: "NUMINA PRIME", count: "134",   pct: "3%"  },
];

const DIV_SPLIT = [
  { name: "THE GHOST",      count: "222", pct: "5%",   note: "rarest" },
  { name: "THE CIPHER",     count: "222", pct: "5%",   note: "rarest" },
  { name: "THE ARCHITECT",  count: "333", pct: "7.5%", note: "" },
  { name: "THE ORACLE",     count: "333", pct: "7.5%", note: "" },
  { name: "THE ANALYST",    count: "370", pct: "8.3%", note: "" },
  { name: "THE NAVIGATOR",  count: "370", pct: "8.3%", note: "" },
  { name: "THE ARTISAN",    count: "400", pct: "9%",   note: "" },
  { name: "THE HERALD",     count: "400", pct: "9%",   note: "" },
  { name: "THE WEAVER",     count: "400", pct: "9%",   note: "" },
  { name: "THE CATALYST",   count: "400", pct: "9%",   note: "" },
  { name: "THE SIGNAL",     count: "400", pct: "9%",   note: "" },
  { name: "THE STRATEGIST", count: "394", pct: "8.9%", note: "" },
];

const HOW_BLOCKS = [
  {
    head: "→ MINT",
    body: "Your block hash picks your division, tier, and soul. All locked on-chain. No do-overs.",
  },
  {
    head: "→ SOUL",
    body: "Lives on Arweave. Permanent. Not on any server.",
  },
  {
    head: "→ WORK",
    body: "Your agent runs tasks. Every output is logged on Ethereum. Sell the NFT, the history goes with it.",
  },
];

const MINT_STATS = [
  { v: "4,444",    l: "SUPPLY"  },
  { v: "TBA",      l: "PRICE"   },
  { v: "ETHEREUM", l: "NETWORK" },
  { v: "SOON",     l: "LAUNCH"  },
];

// ── Section header (matches landing page pattern) ─────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 mb-10">
      <hr className="chain-border flex-1" />
      <span className="pixel text-[9px] text-primary">{title}</span>
      <hr className="chain-border flex-1" />
    </div>
  );
}

// ── Track card ────────────────────────────────────────────────────────────────

function TrackCard({
  label,
  divs,
}: {
  label: string;
  divs: { name: string; desc: string }[];
}) {
  return (
    <div className="numina-card bracketed p-0">
      <div
        className="px-5 py-3"
        style={{ borderBottom: "1px solid #222222", background: "#080808" }}>
        <p className="pixel text-[7px] text-dim">{label}</p>
      </div>
      {divs.map(({ name, desc }, i) => (
        <div
          key={name}
          className="px-5 py-4"
          style={{ borderBottom: i < divs.length - 1 ? "1px solid #222222" : "none" }}>
          <p className="pixel text-[8px] text-primary mb-2">{name}</p>
          <p className="mono text-xs leading-relaxed" style={{ color: "#666666" }}>{desc}</p>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  return (
    <main>

      {/* ── SECTION 1: HERO ── */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-20 pb-16">
        <h1
          className="pixel leading-loose glitch mb-8"
          style={{ fontSize: "clamp(16px,3.5vw,32px)", color: "#FFFFFF", maxWidth: 640 }}>
          EVERY NUMINA<br />HAS A SOUL.
        </h1>
        <p className="mono leading-relaxed" style={{ color: "#666666", maxWidth: 480, fontSize: 14 }}>
          4,444 AI agents. Souls on Arweave. Owned on Ethereum.<br />
          Mint collapses one into existence — division, tier, soul, locked forever.<br />
          The agent works. The chain remembers. You own the spirit.
        </p>
      </section>

      {/* ── SECTION 2: THE 12 DIVISIONS ── */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <SectionHeader title="THE 12 DIVISIONS" />

        <p className="mono text-sm leading-relaxed mb-10" style={{ color: "#666666" }}>
          Every NUMINA is a specialist. Pick the work, you pick the agent.<br />
          Two tracks. Twelve roles. Each one does a real job.
        </p>

        <div className="flex flex-col gap-6">
          <TrackCard
            label="BUILDER TRACK — agents that build and ship"
            divs={BUILDER_DIVS}
          />
          <TrackCard
            label="COMMUNITY TRACK — agents that move people"
            divs={COMMUNITY_DIVS}
          />
        </div>

        <p className="mono text-xs mt-8" style={{ color: "#444444" }}>
          Your division is decided at mint. It never changes.
        </p>
      </section>

      {/* ── SECTION 3: THE 4 TIERS ── */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <SectionHeader title="THE 4 TIERS" />

        <p className="mono text-sm leading-relaxed mb-10" style={{ color: "#666666" }}>
          Same division, different rank. Tier sets how deep the agent goes.
        </p>

        <div className="numina-card bracketed p-0">
          {TIERS.map(({ name, rarity, desc }, i) => (
            <div
              key={name}
              className="grid px-5 py-4"
              style={{
                borderBottom: i < TIERS.length - 1 ? "1px solid #222222" : "none",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "16px",
                alignItems: "center",
              }}>
              <span className="pixel text-[8px] text-primary">{name}</span>
              <span className="mono text-xs text-dim">{rarity}</span>
              <span className="mono text-xs" style={{ color: "#666666" }}>{desc}</span>
            </div>
          ))}
        </div>

        <p className="mono text-xs mt-8" style={{ color: "#444444" }}>
          Higher tier = deeper output = rarer agent.<br />
          Tier is decided at mint. It never changes.
        </p>
      </section>

      {/* ── SECTION 4: THE SPLIT ── */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <SectionHeader title="THE SPLIT" />

        <p className="mono text-sm leading-relaxed mb-10" style={{ color: "#666666" }}>
          4,444 agents. Two scarcity layers.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* By tier */}
          <div className="numina-card bracketed p-0">
            <div
              className="px-5 py-3"
              style={{ borderBottom: "1px solid #222222", background: "#080808" }}>
              <p className="pixel text-[7px] text-dim">BY TIER</p>
            </div>
            {TIER_SPLIT.map(({ name, count, pct }, i) => (
              <div
                key={name}
                className="grid px-5 py-3"
                style={{
                  borderBottom: i < TIER_SPLIT.length - 1 ? "1px solid #222222" : "none",
                  gridTemplateColumns: "1fr auto auto",
                  gap: "16px",
                  alignItems: "center",
                }}>
                <span className="pixel text-[7px] text-primary">{name}</span>
                <span className="mono text-xs text-dim">{count}</span>
                <span className="mono text-xs" style={{ color: "#666666" }}>{pct}</span>
              </div>
            ))}
          </div>

          {/* By division */}
          <div className="numina-card bracketed p-0">
            <div
              className="px-5 py-3"
              style={{ borderBottom: "1px solid #222222", background: "#080808" }}>
              <p className="pixel text-[7px] text-dim">BY DIVISION</p>
            </div>
            {DIV_SPLIT.map(({ name, count, pct, note }, i) => (
              <div
                key={name}
                className="grid px-5 py-3"
                style={{
                  borderBottom: i < DIV_SPLIT.length - 1 ? "1px solid #222222" : "none",
                  gridTemplateColumns: "1fr auto auto auto",
                  gap: "12px",
                  alignItems: "center",
                }}>
                <span className="pixel text-[7px] text-primary">{name}</span>
                <span className="mono text-[10px] text-dim">{count}</span>
                <span className="mono text-[10px]" style={{ color: "#666666" }}>{pct}</span>
                <span className="mono text-[10px]" style={{ color: "#444444" }}>{note}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="mono text-xs mt-8" style={{ color: "#444444" }}>
          A Numina Prime Ghost is rarer than a Recruit Strategist.<br />
          The math is permanent. Locked at mint.
        </p>
      </section>

      {/* ── SECTION 5: HOW IT WORKS ── */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <SectionHeader title="HOW IT WORKS" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_BLOCKS.map(({ head, body }) => (
            <div key={head} className="numina-card bracketed p-6 flex flex-col gap-4">
              <span className="pixel text-[9px] text-primary">{head}</span>
              <hr className="chain-border" />
              <p className="mono text-xs leading-relaxed" style={{ color: "#666666" }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 6: MINT ── */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-xl mx-auto numina-card bracketed p-10 flex flex-col items-center gap-8">
          <SectionHeader title="MINT" />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full">
            {MINT_STATS.map(({ v, l }) => (
              <div key={l} className="flex flex-col items-center gap-1">
                <span className="pixel text-[12px]" style={{ color: "#FFFFFF" }}>{v}</span>
                <span className="mono text-[10px] text-dim">{l}</span>
              </div>
            ))}
          </div>

          <hr className="chain-border w-full" />

          {/* TODO: replace href="#" with actual X/Twitter handle once locked */}
          <a href="#" className="mono text-sm" style={{ color: "#666666" }}>
            Follow @NUMINA.
          </a>
        </div>
      </section>

    </main>
  );
}
