"use client";

import { useState } from "react";
import { ConnectAndSignIn } from "@/components/ConnectAndSignIn";

export function PointsClient() {
  const [sessionAddr, setSessionAddr] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-center">
        <ConnectAndSignIn onSessionChange={setSessionAddr} />
      </div>

      {sessionAddr && (
        <>
          <p className="mono text-xs text-dim text-center">
            {sessionAddr.slice(0, 6)}...{sessionAddr.slice(-4)}
          </p>

          <div className="numina-card bracketed p-6">
            <p className="pixel text-[7px] text-dim mb-3">// SUBMIT WORK</p>
            <p className="mono text-xs text-dim">Submission form — Stage 2</p>
          </div>

          <div className="numina-card bracketed p-6">
            <p className="pixel text-[7px] text-dim mb-3">// YOUR STANDING</p>
            <p className="mono text-xs text-dim">Your points: 0 · Tier: —</p>
          </div>
        </>
      )}
    </div>
  );
}
