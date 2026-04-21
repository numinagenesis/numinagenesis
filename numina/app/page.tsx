import Link from "next/link";
import Ticker from "@/components/Ticker";
import AgentCard from "@/components/AgentCard";

const STATS = [
  { value: "4,444", label: "SUPPLY"  },
  { value: "12",    label: "DIVS"    },
  { value: "4",     label: "TIERS"   },
  { value: "∞",     label: "TASKS"   },
];

const PREVIEW_CARDS = [
  { division: "engineering" as const, tier: "director"  as const, rarity: "legendary" as const,
    flavorText: "Precise. Relentless. Permanent.", tokenId: "???" },
  { division: "research"    as const, tier: "operator"  as const, rarity: "epic"       as const,
    flavorText: "Finds what others miss.",          tokenId: "???" },
  { division: "security"    as const, tier: "operator"  as const, rarity: "rare"       as const,
    flavorText: "Nothing passes without proof.",    tokenId: "???" },
  { division: "community"   as const, tier: "recruit"   as const, rarity: "classified" as const,
    flavorText: "MINT TO REVEAL",                  tokenId: "???" },
];

const EXPLAINER = [
  { label: "SOUL",    desc: "Lives on Arweave forever. Permanent storage. No servers." },
  { label: "HISTORY", desc: "Every task hash written to Ethereum. Immutable résumé." },
  { label: "PROOF",   desc: "Collapse traceable to your exact mint block + entropy." },
];

export default function HomePage() {
  return (
    <>
      <Ticker items={[
        "NO IPFS","NO SERVERS","SOULS ON ARWEAVE",
        "QUANTUM COLLAPSE","MINT COMING SOON","4,444 AGENTS",
      ]} />

      <main>
        {/* ── HERO ── */}
        <section className="flex flex-col items-center justify-center text-center px-6 pt-24 pb-20">
          <span className="mono text-xs mb-6" style={{ color: "#666666", letterSpacing: "0.3em" }}>
            ERC-8004 · TRUSTLESS AGENTS · ARWEAVE PERMANENT
          </span>

          <h1 className="pixel leading-loose mb-8 glitch"
              style={{ fontSize: "clamp(18px,4vw,36px)", color: "#FFFFFF", maxWidth: 640 }}>
            EVERY NUMINA<br />HAS A SOUL.
          </h1>

          <p className="mono mb-10 leading-relaxed" style={{ color: "#666666", maxWidth: 480, fontSize: 14 }}>
            4,444 AI agents. Soul fragments waiting in superposition on Arweave.
            Your mint collapses one into existence. That soul works, learns, and
            builds a résumé — on-chain. Forever.
          </p>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-6 mb-12 w-full max-w-lg">
            {STATS.map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="pixel" style={{ fontSize: "clamp(14px,3vw,22px)", color: "#FFFFFF" }}>{value}</span>
                <span className="mono text-[10px] text-dim">{label}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/summon" className="btn-amber">► ENTER SUMMON</Link>
            <button className="btn-outline">NOTIFY ME</button>
          </div>
        </section>

        {/* ── BOUNTY BOARD ── */}
        <section className="px-6 py-16 max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-10">
            <hr className="chain-border flex-1" />
            <span className="pixel text-[9px] text-primary">SOUL REGISTRY // PREVIEW</span>
            <hr className="chain-border flex-1" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PREVIEW_CARDS.map((card, i) => (
              <AgentCard key={i} {...card} revealed={card.rarity !== "classified"} />
            ))}
          </div>
        </section>

        {/* ── ON-CHAIN EXPLAINER ── */}
        <section className="px-6 py-16 max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-10">
            <hr className="chain-border flex-1" />
            <span className="pixel text-[9px] text-primary">HOW IT WORKS</span>
            <hr className="chain-border flex-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {EXPLAINER.map(({ label, desc }) => (
              <div key={label} className="numina-card bracketed p-6 flex flex-col gap-4">
                <span className="pixel text-[11px] text-primary">{label}</span>
                <span className="pixel text-[7px] text-dim">→</span>
                <p className="mono text-xs leading-relaxed" style={{ color: "#666666" }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── MINT CTA ── */}
        <section className="px-6 py-20 text-center">
          <div className="max-w-xl mx-auto numina-card bracketed p-10 flex flex-col items-center gap-6">
            <h2 className="pixel leading-loose" style={{ fontSize: "clamp(12px,3vw,20px)", color: "#FFFFFF" }}>
              MINT IS COMING.
            </h2>
            <div className="grid grid-cols-3 gap-8">
              {[["4,444","SUPPLY"],["TBA","PRICE"],["ETH","NETWORK"]].map(([v,l])=>(
                <div key={l} className="flex flex-col items-center gap-1">
                  <span className="pixel text-[14px]" style={{ color: "#FFFFFF" }}>{v}</span>
                  <span className="mono text-[10px] text-dim">{l}</span>
                </div>
              ))}
            </div>
            <hr className="chain-border w-full" />
            <div className="flex flex-wrap gap-4 justify-center">
              <a href="https://twitter.com/numina_xyz" target="_blank" rel="noopener noreferrer"
                 className="btn-outline">FOLLOW @NUMINA</a>
              <Link href="/summon" className="btn-amber">► TRY SUMMON</Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
