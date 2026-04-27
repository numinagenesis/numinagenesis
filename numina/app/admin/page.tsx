"use client";

// Prevent Next.js from statically rendering this page — admin always needs a fresh shell.
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useDisconnect } from "wagmi";
import { ConnectAndSignIn } from "@/components/ConnectAndSignIn";
import {
  CampaignStateCard,
  XHandleCard,
  EarnRatesCard,
  RulesCard,
  TiersCard,
  type FullConfig,
} from "./cards";

// ── Auth state ─────────────────────────────────────────────────────────────────

type Whoami = { isAdmin: boolean; address: string | null };

// ── Loading spinner ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[70vh]">
      <p className="pixel text-[7px] text-dim">LOADING...</p>
    </main>
  );
}

// ── State A — not authenticated ────────────────────────────────────────────────

function StateA({ onSession }: { onSession: (addr: string | null) => void }) {
  return (
    <main className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center gap-6">
      <p className="pixel text-[7px] text-dim">// ADMIN ACCESS</p>
      <ConnectAndSignIn onSessionChange={onSession} />
      <p className="mono text-xs" style={{ color: "#444444" }}>
        Admin access requires authentication.
      </p>
    </main>
  );
}

// ── State B — wrong wallet ─────────────────────────────────────────────────────

function StateB({
  address,
  onSignOut,
}: {
  address: string;
  onSignOut: () => void;
}) {
  const { disconnect } = useDisconnect();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    disconnect();
    onSignOut();
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center gap-4">
      <p className="pixel text-[7px] text-dim">// ACCESS DENIED</p>
      <h1 className="pixel" style={{ fontSize: "clamp(20px,4vw,36px)", color: "#FF4444" }}>
        DENIED
      </h1>
      <p className="mono text-xs" style={{ color: "#666666" }}>
        {address.slice(0, 6)}...{address.slice(-4)}
      </p>
      <p className="mono text-xs" style={{ color: "#444444" }}>
        This wallet is not authorized.
      </p>
      <button onClick={signOut} className="btn-ghost pixel text-[7px] mt-4">
        SIGN OUT
      </button>
    </main>
  );
}

// ── State C — admin dashboard ──────────────────────────────────────────────────

function StateC({
  config,
  loading,
  address,
  onSignOut,
}: {
  config: FullConfig | null;
  loading: boolean;
  address: string;
  onSignOut: () => void;
}) {
  const { disconnect } = useDisconnect();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    disconnect();
    onSignOut();
  }

  return (
    <main className="px-4 sm:px-6 py-12 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
        <div>
          <p className="pixel text-[7px] text-dim mb-2">// NUMINA ADMIN</p>
          <h1 className="pixel glitch" style={{ fontSize: "clamp(14px,2.5vw,20px)", color: "#FFFFFF" }}>
            CONFIG PANEL
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="mono text-xs text-dim">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <button onClick={signOut} className="btn-ghost pixel text-[7px]">
            SIGN OUT
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-10">
        <hr className="chain-border flex-1" />
        <span className="pixel text-[7px] text-dim">CAMPAIGN CONFIG</span>
        <hr className="chain-border flex-1" />
      </div>

      {/* Cards */}
      {loading || !config ? (
        <p className="pixel text-[7px] text-dim text-center">LOADING CONFIG...</p>
      ) : (
        <div className="flex flex-col gap-6">
          <CampaignStateCard initial={config.campaign_state} />
          <XHandleCard        initial={config.x_handle} />
          <EarnRatesCard      initial={config.earn_rates} />
          <RulesCard          initial={config.rules} />
          <TiersCard          initial={config.tiers} />
        </div>
      )}
    </main>
  );
}

// ── Root page ──────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [whoami, setWhoami] = useState<Whoami | null>(null); // null = checking
  const [config, setConfig] = useState<FullConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch("/api/admin/config");
      if (res.ok) setConfig(await res.json());
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const checkWhoami = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/whoami");
      const data: Whoami = await res.json();
      setWhoami(data);
      if (data.isAdmin) {
        fetchConfig();
      }
    } catch {
      setWhoami({ isAdmin: false, address: null });
    }
  }, [fetchConfig]);

  useEffect(() => {
    checkWhoami();
  }, [checkWhoami]);

  // Called by ConnectAndSignIn when session changes
  function handleSessionChange(addr: string | null) {
    if (addr) {
      // Re-check admin status with the new session
      checkWhoami();
    } else {
      setWhoami({ isAdmin: false, address: null });
      setConfig(null);
    }
  }

  // Called when signing out from STATE B or STATE C
  function handleSignOut() {
    setWhoami({ isAdmin: false, address: null });
    setConfig(null);
  }

  // Still checking
  if (whoami === null) return <Spinner />;

  // No session at all
  if (!whoami.address) return <StateA onSession={handleSessionChange} />;

  // Session exists but not admin
  if (!whoami.isAdmin) {
    return <StateB address={whoami.address} onSignOut={handleSignOut} />;
  }

  // Admin authenticated
  return (
    <StateC
      config={config}
      loading={configLoading}
      address={whoami.address}
      onSignOut={handleSignOut}
    />
  );
}
