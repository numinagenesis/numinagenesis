export const WL_THRESHOLD = 500;

export type PreMintAgent = {
  id: string;
  wallet: string;
  division: string;
  tier: string;
  fragment_id: string;
  soul_hash: string;
  is_active: boolean;
  task_count: number;
  created_at: string;
};

export type SoulFragment = {
  wallet: string;
  balance: number;
  updated_at: string;
};
