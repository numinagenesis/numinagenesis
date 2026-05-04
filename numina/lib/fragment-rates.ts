export const FRAGMENT_RATES = {
  RECRUIT: 10,
  OPERATOR: 25,
  DIRECTOR: 50,
  'NUMINA PRIME': 100,
} as const;

export type FragmentRateKey = keyof typeof FRAGMENT_RATES;
