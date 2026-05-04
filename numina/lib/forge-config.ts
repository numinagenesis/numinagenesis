import { getConfig } from "@/lib/config-cache";

export type ForgeConfig = {
  wl_guaranteed:     number;
  wl_bonus:          number;
  daily_task_limit:  number;
  burn_carry_rate:   number;
  swap_expiry_hours: number;
  max_task_input:    number;
  collab_pool:       number;
};

export type SupplyConfig = {
  supply:     string;
  mint_price: string;
  chain:      string;
};

const FORGE_DEFAULTS: ForgeConfig = {
  wl_guaranteed:     500,
  wl_bonus:          1000,
  daily_task_limit:  10,
  burn_carry_rate:   0.5,
  swap_expiry_hours: 72,
  max_task_input:    200,
  collab_pool:       888,
};

const SUPPLY_DEFAULTS: SupplyConfig = {
  supply:     "TBA",
  mint_price: "TBA",
  chain:      "Ethereum",
};

export async function getForgeConfig(): Promise<ForgeConfig> {
  try {
    const raw = await getConfig<Partial<ForgeConfig>>("forge_config");
    return { ...FORGE_DEFAULTS, ...raw };
  } catch {
    return FORGE_DEFAULTS;
  }
}

export async function getSupplyConfig(): Promise<SupplyConfig> {
  try {
    const raw = await getConfig<Partial<SupplyConfig>>("supply_config");
    return { ...SUPPLY_DEFAULTS, ...raw };
  } catch {
    return SUPPLY_DEFAULTS;
  }
}
