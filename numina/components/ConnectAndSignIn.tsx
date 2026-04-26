"use client";

import { useState, useEffect } from "react";
import { useAccount, useSignMessage, useDisconnect, useChainId } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { SiweMessage } from "siwe";

interface Props {
  onSessionChange?: (address: string | null) => void;
}

export function ConnectAndSignIn({ onSessionChange }: Props) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();

  const [sessionAddress, setSessionAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const addr = data?.address ?? null;
        setSessionAddress(addr);
        onSessionChange?.(addr);
      })
      .catch(() => {
        setSessionAddress(null);
        onSessionChange?.(null);
      })
      .finally(() => setChecking(false));
  }, []);

  async function signIn() {
    if (!address) return;
    setLoading(true);
    try {
      const { nonce } = await fetch("/api/auth/nonce").then((r) => r.json());

      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to NUMINA.",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce,
      });

      const prepared = message.prepareMessage();
      const signature = await signMessageAsync({ message: prepared });

      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prepared, signature }),
      });

      const data = await res.json();
      if (data.ok) {
        setSessionAddress(data.address);
        onSessionChange?.(data.address);
      }
    } catch {
      // user rejected or network error
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSessionAddress(null);
    onSessionChange?.(null);
    disconnect();
  }

  if (checking) {
    return <p className="mono text-xs text-dim">—</p>;
  }

  if (sessionAddress) {
    return (
      <div className="flex items-center gap-4">
        <span className="mono text-xs text-dim">
          {sessionAddress.slice(0, 6)}...{sessionAddress.slice(-4)}
        </span>
        <button onClick={signOut} className="btn-ghost pixel text-[7px]">
          SIGN OUT
        </button>
      </div>
    );
  }

  if (!isConnected) {
    return <ConnectButton label="CONNECT WALLET" />;
  }

  return (
    <button
      onClick={signIn}
      disabled={loading}
      className="btn-amber pixel text-[7px]"
    >
      {loading ? "SIGNING..." : "SIGN IN"}
    </button>
  );
}
