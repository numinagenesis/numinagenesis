"use client";
import { useState } from "react";
import PixelAvatar from "@/components/PixelAvatar";
import { DIVISIONS, TIERS, BUILDER_DIVISIONS, COMMUNITY_DIVISIONS, SKILLS, type DivisionKey, type TierKey } from "@/lib/divisions";

function DivisionCard({ divKey, selected, onClick }: { divKey: DivisionKey; selected: boolean; onClick: () => void }) {
  const div = DIVISIONS[divKey];
  return (
    <button onClick={onClick}
      className="numina-card bracketed text-left p-4 w-full transition-all cursor-pointer"
      style={{ borderColor: selected ? div.color : "#222222",
               boxShadow: selected ? `0 0 20px ${div.color}33` : "none" }}>
      <div className="flex items-center gap-3 mb-3">
        <span className="pixel text-[14px]" style={{ color: div.color }}>{div.icon}</span>
        <span className="pixel text-[9px]" style={{ color: selected ? div.color : "#FFFFFF" }}>
          {div.name.toUpperCase()}
        </span>
      </div>
      <p className="mono text-[11px] text-muted">{div.description}</p>
      <div className="flex items-center justify-between mt-3">
        <span className="mono text-[10px] text-dim">{div.rarity}% of supply</span>
        <span className="pixel text-[7px]" style={{ color: div.color }}>
          {selected ? "SELECTED ▲" : "VIEW ▼"}
        </span>
      </div>
    </button>
  );
}

function DivisionPanel({ divKey }: { divKey: DivisionKey }) {
  const div = DIVISIONS[divKey];
  const skills = SKILLS[divKey];

  return (
    <div className="fade-up numina-card bracketed p-0 md:col-span-2">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4"
           style={{ borderBottom: "1px solid #222222", background: "#080808" }}>
        <PixelAvatar division={divKey} size={48} />
        <div>
          <p className="pixel text-[11px] mb-1" style={{ color: div.color }}>{div.name.toUpperCase()}</p>
          <p className="mono text-xs text-muted">{div.track.toUpperCase()} TRACK · {div.rarity}% rarity</p>
        </div>
      </div>

      {/* Sample output */}
      <div className="p-6">
        <p className="pixel text-[8px] text-dim mb-3">// SAMPLE OUTPUT</p>
        <div className="terminal text-[11px] mb-6" style={{ maxHeight: 180, overflow: "auto" }}>
          <span style={{ color: div.color }}>$ NUMINA {div.name.toUpperCase()} · OPERATOR</span>{"\n"}
          <span style={{ color: "#666666" }}>{"─".repeat(40)}</span>{"\n"}
          <span style={{ color: "#FFFFFF" }}>{div.sampleOutput}</span>
        </div>

        {/* Skills */}
        <p className="pixel text-[8px] text-dim mb-3">// CORE SKILLS</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {skills.map(skill => (
            <span key={skill} className="mono text-[10px] px-2 py-1"
                  style={{ background: "#080808", border: `1px solid ${div.color}44`, color: div.color }}>
              {skill}
            </span>
          ))}
        </div>

        {/* Rarity */}
        <p className="pixel text-[8px] text-dim mb-3">// DIVISION RARITY</p>
        <div className="w-full h-2 rounded-none mb-1" style={{ background: "#080808" }}>
          <div className="h-2 transition-all" style={{ width: `${div.rarity * 4}%`, background: div.color }} />
        </div>
        <div className="flex justify-between">
          <span className="mono text-[10px] text-dim">{div.rarity}% of 4,444</span>
          <span className="mono text-[10px]" style={{ color: div.color }}>
            ~{Math.round(4444 * div.rarity / 100)} agents
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DivisionsPage() {
  const [selected, setSelected] = useState<DivisionKey | null>(null);

  function toggle(key: DivisionKey) {
    setSelected(prev => prev === key ? null : key);
  }

  return (
    <main className="px-6 py-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <p className="pixel text-[8px] text-dim mb-3">// 12 DIVISIONS</p>
        <h1 className="pixel text-[16px] text-primary leading-loose mb-4">
          12 DIVISIONS.<br />INFINITE COMBOS.
        </h1>
        <p className="mono text-sm text-muted max-w-xl">
          Every NUMINA belongs to one division. Click any division to preview its soul,
          sample output, and rarity.
        </p>
      </div>

      {/* Tiers */}
      <div className="numina-card bracketed p-6 mb-12">
        <p className="pixel text-[8px] text-dim mb-6">// 4 TIERS</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(Object.values(TIERS) as typeof TIERS[TierKey][]).map(tier => (
            <div key={tier.key} className="flex flex-col gap-2">
              <span className="pixel text-[9px]" style={{ color: tier.color }}>{tier.name.toUpperCase()}</span>
              <span className="mono text-[11px] text-dim">{tier.label}</span>
              <div className="w-full h-1" style={{ background: "#080808" }}>
                <div className="h-1" style={{ width: `${tier.rarity}%`, background: tier.color }} />
              </div>
              <span className="mono text-[10px] text-muted">{tier.rarity}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Builder track */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-6">
          <p className="pixel text-[10px] text-primary">BUILDER TRACK</p>
          <hr className="chain-border flex-1" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {BUILDER_DIVISIONS.map(key => (
            <DivisionCard key={key} divKey={key} selected={selected === key} onClick={() => toggle(key)} />
          ))}
        </div>
        {selected && BUILDER_DIVISIONS.includes(selected) && (
          <div className="mt-4">
            <DivisionPanel divKey={selected} />
          </div>
        )}
      </div>

      {/* Community track */}
      <div>
        <div className="flex items-center gap-4 mb-6">
          <p className="pixel text-[10px] text-primary">COMMUNITY TRACK</p>
          <hr className="chain-border flex-1" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {COMMUNITY_DIVISIONS.map(key => (
            <DivisionCard key={key} divKey={key} selected={selected === key} onClick={() => toggle(key)} />
          ))}
        </div>
        {selected && COMMUNITY_DIVISIONS.includes(selected) && (
          <div className="mt-4">
            <DivisionPanel divKey={selected} />
          </div>
        )}
      </div>
    </main>
  );
}
