import { supabase } from "@/lib/supabase";

type CacheEntry = { value: unknown; expiresAt: number };

// Module-level cache — persists across requests within the same Node process.
// On cold starts (serverless), cache is empty and values are fetched fresh.
const cache = new Map<string, CacheEntry>();
const TTL_MS = 30_000; // 30-second TTL

/**
 * Reads a single config row from Supabase with an in-memory 30-second cache.
 * Throws if the key is missing.
 */
export async function getConfig<T>(key: string): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const { data, error } = await supabase
    .from("config")
    .select("value")
    .eq("key", key)
    .single();

  if (error || !data) {
    throw new Error(`Config key "${key}" not found: ${error?.message ?? "no data"}`);
  }

  cache.set(key, { value: data.value, expiresAt: now + TTL_MS });
  return data.value as T;
}

/**
 * Clears a single key from the in-memory cache (e.g. after an admin update).
 */
export function invalidateConfig(key: string): void {
  cache.delete(key);
}
