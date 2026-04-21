import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "NUMINA — Every soul has a chain.",
  description: "4,444 AI agents. Soul fragments on Arweave. Your mint collapses one into existence. Forever.",
  openGraph: {
    title: "NUMINA — Every soul has a chain.",
    description: "4,444 AI agents. Soul fragments waiting in superposition on Arweave.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
        <footer className="border-t border-border mt-24 py-10 text-center">
          <p className="pixel text-[8px] text-dim">
            NUMINA · ERC-8004 · {process.env.NEXT_PUBLIC_CHAIN?.toUpperCase() ?? "ETHEREUM"} · © 2025
          </p>
          <p className="mono text-xs text-dim mt-2">
            4,444 souls. Permanent. Traceable. Yours.
          </p>
        </footer>
      </body>
    </html>
  );
}
