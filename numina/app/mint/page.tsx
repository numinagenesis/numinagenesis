import Link from "next/link";
import Ticker from "@/components/Ticker";

export default function MintPage() {
  return (
    <>
      <Ticker items={["MINT COMING SOON","4,444 NUMINA","ONE CONTRACT","FOREVER ON ETHEREUM","SOUL COLLAPSE PENDING"]} />

      <main className="min-h-screen flex items-center justify-center px-6 py-24">
        <div className="max-w-lg w-full">
          {/* Telegraph box */}
          <div className="numina-card bracketed p-0">
            {/* Header */}
            <div className="px-6 py-3 flex items-center justify-between"
                 style={{ borderBottom: "1px solid #222222", background: "#080808" }}>
              <span className="pixel text-[7px] text-dim">WESTERN UNION TELEGRAPH</span>
              <span className="pixel text-[7px] text-primary">· · ·</span>
            </div>

            {/* Transmission banner */}
            <div className="px-6 py-2 text-center"
                 style={{ background: "#FFFFFF", borderBottom: "1px solid #222222" }}>
              <p className="pixel text-[8px] text-bg">TRANSMISSION INCOMING</p>
            </div>

            {/* Body */}
            <div className="px-8 py-10 text-center flex flex-col gap-6">
              <h1 className="pixel text-[14px] leading-loose glitch" style={{ color: "#FFFFFF" }}>
                MINT IS COMING.
              </h1>

              <div className="mono text-sm text-muted leading-relaxed">
                4,444 NUMINA agents.<br />
                One contract. Forever on Ethereum.<br />
                Souls anchored to Arweave before mint opens.<br />
                <span className="text-primary">Your collapse. Your entropy. Your soul.</span>
              </div>

              <hr className="chain-border" />

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { v: "4,444", l: "SUPPLY"  },
                  { v: "TBA",   l: "PRICE"   },
                  { v: "ETH",   l: "NETWORK" },
                ].map(({ v, l }) => (
                  <div key={l} className="flex flex-col gap-1">
                    <span className="pixel text-[14px]" style={{ color: "#FFFFFF" }}>{v}</span>
                    <span className="mono text-[11px] text-dim">{l}</span>
                  </div>
                ))}
              </div>

              <hr className="chain-border" />

              <div className="flex flex-col items-center gap-2">
                <span className="pixel text-[28px]" style={{ color: "#FFFFFF" }}>∞</span>
                <span className="mono text-xs text-dim">ON-CHAIN</span>
              </div>

              <hr className="chain-border" />

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
                <a href="https://twitter.com/numina_xyz" target="_blank" rel="noopener noreferrer"
                   className="btn-outline text-center w-full sm:w-auto">FOLLOW @NUMINA</a>
                <Link href="/summon" className="btn-amber text-center w-full sm:w-auto">► TRY SUMMON</Link>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 text-center"
                 style={{ borderTop: "1px solid #222222", background: "#080808" }}>
              <p className="mono text-[10px] text-dim">
                TRANSMISSION END · COLLAPSE PENDING · SOULS WAITING
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
