import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";

const ALLOWED_KEYS = [
  "campaign_state",
  "x_handle",
  "earn_rates",
  "rules",
  "tiers",
  "sybil_rules",
  "moderation",
  "forge_config",
  "supply_config",
] as const;

type AllowedKey = (typeof ALLOWED_KEYS)[number];

/**
 * GET /api/admin/config
 * Returns all 5 config rows as a single merged object.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  const { data, error } = await supabase
    .from("config")
    .select("key, value");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = Object.fromEntries(
    (data ?? []).map((row) => [row.key, row.value])
  );

  return NextResponse.json(result);
}

/**
 * PATCH /api/admin/config
 * Body: { key: string, value: object }
 * Validates key, upserts using service-role client.
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  const body = await req.json();
  const { key, value } = body as { key: string; value: unknown };

  if (!ALLOWED_KEYS.includes(key as AllowedKey)) {
    return NextResponse.json(
      { error: `Invalid config key: "${key}". Must be one of: ${ALLOWED_KEYS.join(", ")}` },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("config")
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, key, value });
}
