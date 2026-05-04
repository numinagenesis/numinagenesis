import PixelAvatar from "./PixelAvatar";
import type { DivisionKey, TierKey } from "@/lib/divisions";
import { DIVISIONS, TIERS } from "@/lib/divisions";

type Rarity = "legendary" | "epic" | "rare" | "uncommon" | "classified";

interface AgentCardProps {
  division: DivisionKey | "classified";
  tier?: TierKey | "classified";
  tokenId?: string;
  flavorText?: string;
  rarity?: Rarity;
  revealed?: boolean;
  fragmentId?: string;
  soulHash?: string;
}

const RARITY_LABEL: Record<Rarity, string> = {
  legendary:  "LEGENDARY",
  epic:       "EPIC",
  rare:       "RARE",
  uncommon:   "UNCOMMON",
  classified: "CLASSIFIED",
};

export default function AgentCard({
  division, tier = "operator", tokenId = "???",
  flavorText = "MINT TO REVEAL", rarity = "classified", revealed = false,
  fragmentId, soulHash,
}: AgentCardProps) {
  const div = division !== "classified" ? DIVISIONS[division] : null;
  const tierInfo = tier !== "classified" ? TIERS[tier as TierKey] : null;

  return (
    <div className="numina-card bracketed p-0 flex flex-col" style={{ minWidth: 200 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2"
           style={{ borderBottom: "1px solid #222222" }}>
        <span className="pixel text-[7px] text-muted">CLASSIFIED</span>
        <span className={`pixel text-[7px] rarity-${rarity}`}>{RARITY_LABEL[rarity]}</span>
      </div>

      {/* Avatar */}
      <div className="flex items-center justify-center py-6"
           style={{ background: "#0A0A0A", borderBottom: "1px solid #222222", position: "relative" }}>
        {revealed && div ? (
          <PixelAvatar division={division} size={80} />
        ) : (
          <div style={{ width: 80, height: 80, background: "#111111", border: "1px solid #222222",
                        display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="pixel text-[16px]" style={{ color: "#333333" }}>?</span>
          </div>
        )}
        {/* Scanline overlay */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
          background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 4px)" }} />
      </div>

      {/* Info */}
      <div className="px-3 py-3 flex flex-col gap-1.5">
        <p className="pixel text-[9px] text-primary">
          {div ? div.name.toUpperCase() : "DIVISION ???"}
        </p>
        <p className="mono text-[11px] text-muted italic">{flavorText}</p>
        <hr className="chain-border my-1" />
        <div className="flex justify-between">
          <span className="mono text-[10px] text-dim">TOKEN #</span>
          <span className="mono text-[10px] text-primary">{tokenId}</span>
        </div>
        <div className="flex justify-between">
          <span className="mono text-[10px] text-dim">TIER</span>
          <span className="mono text-[10px]" style={{ color: tierInfo?.color ?? "#666666" }}>
            {tierInfo ? tierInfo.name.toUpperCase() : "???"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="mono text-[10px] text-dim">CHAIN</span>
          <span className="mono text-[10px] text-muted">ETH</span>
        </div>
        <div className="flex justify-between">
          <span className="mono text-[10px] text-dim">COLLAPSE</span>
          <span className="mono text-[10px]" style={{ color: revealed ? "#FFFFFF" : "#444444" }}>
            {revealed ? "RESOLVED ✓" : "PENDING"}
          </span>
        </div>
        {fragmentId && (
          <div className="flex justify-between">
            <span className="mono text-[10px] text-dim">FRAGMENT</span>
            <span className="mono text-[10px] text-primary">{fragmentId}</span>
          </div>
        )}
        {soulHash && (
          <div className="flex justify-between gap-2 min-w-0">
            <span className="mono text-[10px] text-dim shrink-0">SOUL HASH</span>
            <span className="mono text-[10px] text-muted truncate">{soulHash.slice(0, 12)}…</span>
          </div>
        )}
      </div>
    </div>
  );
}
