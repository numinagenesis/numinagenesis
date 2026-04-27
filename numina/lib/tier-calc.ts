export type TierConfig = {
  name: string;
  threshold: number;
  reward: string | null;
};

/**
 * Returns the highest tier the user qualifies for,
 * or null if they haven't reached any tier yet.
 *
 * Tiers are sorted by threshold descending so we find the highest match first.
 */
export function calculateTier(
  points: number,
  tiers: TierConfig[]
): TierConfig | null {
  const sorted = [...tiers].sort((a, b) => b.threshold - a.threshold);
  for (const tier of sorted) {
    if (points >= tier.threshold) return tier;
  }
  return null;
}

/**
 * Returns the next tier above the current one, or null if at max tier.
 */
export function nextTierFor(
  points: number,
  tiers: TierConfig[]
): TierConfig | null {
  const sorted = [...tiers].sort((a, b) => a.threshold - b.threshold);
  for (const tier of sorted) {
    if (tier.threshold > points) return tier;
  }
  return null;
}

/**
 * Progress (0–1) toward the next tier.
 * Returns 1 if already at max tier.
 */
export function tierProgress(
  points: number,
  tiers: TierConfig[]
): number {
  const current = calculateTier(points, tiers);
  const next = nextTierFor(points, tiers);

  if (!next) return 1; // max tier

  const base = current?.threshold ?? 0;
  const span = next.threshold - base;
  if (span <= 0) return 1;

  return Math.min(1, (points - base) / span);
}
