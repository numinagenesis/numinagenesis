import {
  DIVISION_PIXELS,
  DIVISION_TRAITS,
  DIVISION_META,
  APP_DIVISION_TO_PIXEL,
  APP_TIER_TO_PIXEL,
  type DivisionPixelKey,
  type TierPixelKey,
} from './divisionData';

// ── Seeded RNG (LCG — copy exactly, never use Math.random inside generateToken) ──

export function SeededRand(seed: number) {
  let s = seed >>> 0;
  const next = () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  return {
    next,
    pick: <T>(arr: T[]): T => arr[Math.floor(next() * arr.length)],
    int:  (min: number, max: number) =>
      Math.floor(next() * (max - min + 1)) + min,
  };
}

// ── Generated token shape ─────────────────────────────────────────────────────

export type GeneratedToken = {
  tokenId:     number;
  divisionKey: string;   // DivisionPixelKey
  tierKey:     string;   // TierPixelKey
  accentColor: string;
  traits:      Record<string, string>;
  glitchOffset: number;
};

// ── Main generator — deterministic, same seed = same output forever ───────────

export function generateToken(
  tokenId: number,
  divisionKey?: string,
  tierOverride?: string,
): GeneratedToken {
  const rng = SeededRand(tokenId * 7919 + 1337);

  // Pick division
  const divKeys = Object.keys(DIVISION_PIXELS) as DivisionPixelKey[];
  const rawDiv  = divisionKey
    ? (APP_DIVISION_TO_PIXEL[divisionKey] ?? divisionKey)  // map app key → pixel key
    : divKeys[Math.floor(rng.next() * divKeys.length)];
  const divKey = (divKeys.includes(rawDiv as DivisionPixelKey)
    ? rawDiv
    : divKeys[Math.floor(rng.next() * divKeys.length)]) as DivisionPixelKey;

  // Pick tier by weighted probability (or override)
  let tierKey: TierPixelKey;
  if (tierOverride) {
    // Map app tier → pixel tier
    const mapped = APP_TIER_TO_PIXEL[tierOverride];
    tierKey = mapped ?? 'recruit';
  } else {
    const r = rng.next();
    if      (r < 0.03) tierKey = 'prime';
    else if (r < 0.15) tierKey = 'director';
    else if (r < 0.40) tierKey = 'operator';
    else               tierKey = 'recruit';
  }

  // Pick traits deterministically
  const traitDefs = DIVISION_TRAITS[divKey];
  const traits: Record<string, string> = {};
  Object.entries(traitDefs).forEach(([k, opts]) => {
    traits[k] = rng.pick(opts);
  });

  // Accent: prime always gold, others use division accent
  const accentColor = tierKey === 'prime'
    ? '#FFD700'
    : DIVISION_META[divKey].ac;

  return {
    tokenId,
    divisionKey: divKey,
    tierKey,
    accentColor,
    traits,
    glitchOffset: rng.int(0, 40),
  };
}

// ── Stable seed from a soul_hash hex string ───────────────────────────────────
// Use this to generate a deterministic token for an existing agent.

export function soulHashToSeed(soulHash: string | null | undefined): number {
  if (!soulHash) return 12345;
  const parsed = parseInt(soulHash.slice(0, 8), 16);
  return isNaN(parsed) ? 12345 : parsed;
}
