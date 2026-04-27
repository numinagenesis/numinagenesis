import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — server-only.
 * NEVER import this in client components or expose to the browser.
 * Use only in API routes for writes that bypass RLS.
 */
function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local and Vercel env vars."
    );
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export const supabaseAdmin = createAdminClient();
