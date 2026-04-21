import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent NFT — Hire AI. Own the Work.",
  description: "Mint a specialist AI agent, assign a task, own the result on-chain forever.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
