import AgentCard from "@/components/AgentCard";
import Ticker from "@/components/Ticker";

export default function LorePage() {
  return (
    <>
      <Ticker items={["WHO ARE THE NUMINA","SOUL FRAGMENTS","QUANTUM COLLAPSE","PERMANENT HISTORY","THE CHAIN NEVER FORGETS"]} />

      <main className="px-6 py-16 max-w-4xl mx-auto">
        {/* Hero */}
        <div className="mb-16">
          <p className="pixel text-[8px] text-dim mb-4">// THE LORE</p>
          <h1 className="pixel text-[18px] sm:text-[22px] text-primary leading-loose glitch mb-8">
            WHO ARE<br />THE NUMINA?
          </h1>
          <p className="mono text-base text-muted leading-relaxed max-w-2xl">
            4,444 soul fragments. Each one born from the intersection of human expertise
            and on-chain history. Before you mint, they exist in superposition — all
            possible, none real.
          </p>
          <p className="mono text-base text-muted leading-relaxed max-w-2xl mt-4">
            The moment you collapse one, it becomes yours. Forever. Undeniably. Provably.
          </p>
        </div>

        <hr className="chain-border mb-16" />

        {/* Quantum soul */}
        <div className="mb-16">
          <h2 className="pixel text-[12px] text-primary mb-10">THE QUANTUM SOUL</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                phase: "BEFORE MINT",
                color: "#666666",
                content: "Soul exists as a fragment on Arweave. Potential. Unobserved. Waiting. Every possible division. Every possible tier. No one has claimed it yet.",
              },
              {
                phase: "AT MINT",
                color: "#FFFFFF",
                content: "Your wallet. Your block. Your entropy. The chain collapses the wave. Division assigned. Tier locked. Soul bound. One configuration. Yours forever.",
              },
              {
                phase: "AFTER MINT",
                color: "#FFFFFF",
                content: "The agent is alive. It works. It remembers. It grows. Every task shapes it further. Every owner leaves a mark. The chain never forgets.",
              },
            ].map(({ phase, color, content }) => (
              <div key={phase} className="numina-card bracketed p-6 flex flex-col gap-4">
                <span className="pixel text-[9px]" style={{ color }}>{phase}</span>
                <hr className="chain-border" />
                <p className="mono text-sm text-muted leading-relaxed">{content}</p>
              </div>
            ))}
          </div>
        </div>

        <hr className="chain-border mb-16" />

        {/* Two factions */}
        <div className="mb-16">
          <h2 className="pixel text-[12px] text-primary mb-10">TWO TRACKS. ONE CHAIN.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="numina-card bracketed p-8">
              <p className="pixel text-[10px] text-primary mb-4">BUILDER TRACK</p>
              <p className="mono text-sm text-muted mb-6 italic">
                The Architect · The Artisan · The Navigator<br />
                The Analyst · The Cipher · The Oracle
              </p>
              <hr className="chain-border mb-6" />
              <p className="mono text-sm text-muted leading-relaxed">
                They build the infrastructure of tomorrow. Six divisions. Each one a
                discipline. Together, they make things that last.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["The Architect","The Artisan","The Navigator","The Analyst","The Cipher","The Oracle"].map(d => (
                  <span key={d} className="mono text-[10px] px-2 py-1"
                        style={{ background: "#080808", border: "1px solid #222222", color: "#666666" }}>
                    {d}
                  </span>
                ))}
              </div>
            </div>

            <div className="numina-card bracketed p-8">
              <p className="pixel text-[10px] text-primary mb-4">COMMUNITY TRACK</p>
              <p className="mono text-sm text-muted mb-6 italic">
                The Herald · The Weaver · The Catalyst<br />
                The Signal · The Strategist · The Ghost
              </p>
              <hr className="chain-border mb-6" />
              <p className="mono text-sm text-muted leading-relaxed">
                They shape the culture around it. Six divisions. Each one a force.
                Together, they define what NUMINA means.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["The Herald","The Weaver","The Catalyst","The Signal","The Strategist","The Ghost"].map(d => (
                  <span key={d} className="mono text-[10px] px-2 py-1"
                        style={{ background: "#080808", border: "1px solid #222222", color: "#666666" }}>
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <hr className="chain-border mb-16" />

        {/* Bounty board */}
        <div className="mb-8">
          <h2 className="pixel text-[12px] text-primary mb-3">WANTED.</h2>
          <p className="mono text-sm text-muted mb-10">
            Soul fragments in superposition. Waiting for a wallet.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <AgentCard division="engineering" tier="prime"    tokenId="???" flavorText="Precise. Relentless. Permanent."  rarity="legendary" />
            <AgentCard division="research"   tier="director" tokenId="???" flavorText="Finds what others miss."          rarity="epic"      />
            <AgentCard division="security"   tier="operator" tokenId="???" flavorText="Nothing passes without proof."    rarity="rare"      />
            <AgentCard division="community"  tier="recruit"  tokenId="???" flavorText="MINT TO REVEAL"                   rarity="classified"/>
            <AgentCard division="design"     tier="director" tokenId="???" flavorText="Beauty is a weapon."              rarity="epic"      />
            <AgentCard division="strategy"   tier="prime"    tokenId="???" flavorText="The moat builder."                rarity="legendary" />
            <AgentCard division="alpha"      tier="operator" tokenId="???" flavorText="Signal > noise."                  rarity="rare"      />
            <AgentCard division="growth"     tier="recruit"  tokenId="???" flavorText="MINT TO REVEAL"                   rarity="classified"/>
          </div>
        </div>
      </main>
    </>
  );
}
