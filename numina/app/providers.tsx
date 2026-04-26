"use client";

import { getDefaultConfig, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { WagmiProvider } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID must be set for WalletConnect to work.
// Get a free project ID from https://cloud.walletconnect.com
const config = getDefaultConfig({
  appName: "NUMINA",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "NUMINA_SET_WALLETCONNECT_PROJECT_ID",
  chains: [mainnet, sepolia],
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#FFFFFF",
            accentColorForeground: "#000000",
            borderRadius: "none",
            fontStack: "system",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
