import { supabase } from "@/lib/supabase";
import { PointsClient } from "./client";

type CampaignState = {
  active: boolean;
  message: string;
};

async function getCampaignState(): Promise<CampaignState> {
  const { data } = await supabase
    .from("config")
    .select("value")
    .eq("key", "campaign_state")
    .single();

  if (!data) return { active: false, message: "Campaign launching soon" };
  return data.value as CampaignState;
}

export default async function PointsPage() {
  const campaign = await getCampaignState();

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

  return (
    <main className="px-6 py-16 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-12">
        <hr className="chain-border flex-1" />
        <span className="pixel text-[9px] text-primary">NUMINA POINTS</span>
        <hr className="chain-border flex-1" />
      </div>

      <PointsClient />
    </main>
  );
}
