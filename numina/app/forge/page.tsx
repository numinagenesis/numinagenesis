"use client";

import Link from "next/link";
import { useState } from "react";
import { ConnectAndSignIn } from "@/components/ConnectAndSignIn";

export default function ForgePage() {
  const [sessionAddr, setSessionAddr] = useState<string | null>(null);

  return (
    <main className="px-6 py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <p className="pixel text-[8px] text-dim mb-3">// THE FORGE</p>
        <h1 className="pixel text-[16px] text-primary leading-loose glitch mb-4">FORGE.</h1>
        <p className="mono text-base text-muted max-w-2xl leading-relaxed">
          The pre-mint agent utility layer. Burn fragments. Swap divisions. Earn your slot.
        </p>
      </div>

      {/* Auth */}
      <div className="flex justify-center mb-10">
        <ConnectAndSignIn onSessionChange={setSessionAddr} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Burn card */}
        <div className="numina-card bracketed" style={{ padding: "28px", background: "#040404" }}>
          <p className="pixel text-[7px] text-dim mb-5">// BURN FRAGMENTS</p>
          <p className="mono text-sm mb-6" style={{ color: "#555555" }}>
            Sacrifice fragments to upgrade your agent&apos;s tier. Irreversible.
          </p>

          {!sessionAddr ? (
            <p className="mono text-xs" style={{ color: "#333333" }}>
              Connect wallet to burn fragments.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <div
                style={{
                  background: "#080808",
                  border: "1px solid #1c1c1c",
                  padding: "16px",
                  textAlign: "center",
                }}
              >
                <p className="pixel text-[7px]" style={{ color: "#333333" }}>
                  BURN — COMING SOON
                </p>
              </div>

              {/* Swap link — below burn button */}
              <Link
                href="/forge/swap"
                className="mono text-xs"
                style={{
                  color: "#555555",
                  textDecoration: "none",
                  display: "block",
                  textAlign: "center",
                  paddingTop: 8,
                }}
              >
                &#8644; SWAP MARKETPLACE
              </Link>
            </div>
          )}
        </div>

        {/* Info card */}
        <div className="numina-card bracketed" style={{ padding: "28px", background: "#040404" }}>
          <p className="pixel text-[7px] text-dim mb-5">// FORGE FEATURES</p>
          <div className="flex flex-col gap-4">
            {[
              {
                label: "BURN",
                desc: "Consume fragments to power up your agent tier.",
                href: null,
                status: "SOON",
              },
              {
                label: "SWAP",
                desc: "Trade your division with another holder. Fragments stay.",
                href: "/forge/swap",
                status: "LIVE",
              },
              {
                label: "COLLAB",
                desc: "Partner projects apply for whitelist allocation.",
                href: "/collab",
                status: "LIVE",
              },
            ].map((f) => (
              <div
                key={f.label}
                style={{ borderBottom: "1px solid #111111", paddingBottom: 16 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="pixel text-[7px]" style={{ color: "#FFFFFF" }}>
                    {f.label}
                  </p>
                  <span
                    className="pixel text-[6px]"
                    style={{ color: f.status === "LIVE" ? "#44aa44" : "#444444" }}
                  >
                    ● {f.status}
                  </span>
                </div>
                <p className="mono text-xs mb-2" style={{ color: "#444444" }}>
                  {f.desc}
                </p>
                {f.href && (
                  <Link
                    href={f.href}
                    className="pixel text-[7px]"
                    style={{ color: "#555555", textDecoration: "none" }}
                  >
                    → {f.label}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
