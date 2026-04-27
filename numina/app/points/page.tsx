export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabase } from "@/lib/supabase";
import { PointsClient } from "./client";

// ── Config types ──────────────────────────────────────────────────────────────

type CampaignState = {
  active: boolean;
  message: string;
};

type XHandle = {
  handle: string;
  mention: string;
};

// ── Server-side fetches ───────────────────────────────────────────────────────

async function getConfigValue<T>(key: string, fallback: T): Promise<T> {
  const { data } = await supabase
    .from("config")
    .select("value")
    .eq("key", key)
    .single();
  return data ? (data.value as T) : fallback;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PointsPage() {
  const campaign = await getConfigValue<CampaignState>("campaign_state", {
    active: false,
    message: "Campaign launching soon",
  });

  // STATE A — campaign inactive
  if (!campaign.active) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <p className="pixel text-[7px] text-dim mb-6">// CAMPAIGN STATUS</p>
        <h1
          className="pixel glitch mb-4"
          style={{ fontSize: "clamp(24px, 5vw, 48px)", color: "#FFFFFF" }}
        >
          STANDBY
        </h1>
        <p className="mono text-sm" style={{ color: "#666666" }}>
          {campaign.message}
        </p>
      </main>
    );
  }

  // Fetch x_handle for the submit card description
  const xHandle = await getConfigValue<XHandle>("x_handle", {
    handle: "numinagenesis",
    mention: "@numinagenesis",
  });

  // STATE B / C — determined client-side by session
  return (
    <main className="px-6 py-16 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-12">
        <hr className="chain-border flex-1" />
        <span className="pixel text-[9px] text-primary">NUMINA POINTS</span>
        <hr className="chain-border flex-1" />
      </div>

      <PointsClient xHandle={xHandle.handle} />
    </main>
  );
}
