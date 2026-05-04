export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CollabClient, type CollabRequest } from "./client";

export default async function AdminCollabPage() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect("/admin");

  const { data, error } = await supabaseAdmin
    .from("collab_requests")
    .select("id, project_name, twitter_handle, wallet, offering, verification_tweet, status, spots_allocated, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);

  const requests: CollabRequest[] = (data ?? []) as CollabRequest[];

  return (
    <main className="px-4 sm:px-6 py-12 max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="pixel text-[7px] text-dim mb-2">// NUMINA ADMIN</p>
          <h1 className="pixel" style={{ fontSize: "clamp(14px,2.5vw,20px)", color: "#FFFFFF" }}>
            COLLAB QUEUE
          </h1>
          {requests.length > 0 && (
            <p className="mono text-xs mt-2" style={{ color: "#aaaa44" }}>
              {requests.length} request{requests.length !== 1 ? "s" : ""} pending
            </p>
          )}
        </div>
        <Link
          href="/admin"
          className="pixel text-[7px]"
          style={{ color: "#555555", textDecoration: "none" }}
        >
          ← BACK TO ADMIN
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <hr className="chain-border flex-1" />
        <span className="pixel text-[7px] text-dim">PENDING REQUESTS</span>
        <hr className="chain-border flex-1" />
      </div>

      {error ? (
        <div className="numina-card bracketed" style={{ padding: "24px", background: "#040404" }}>
          <p className="mono text-xs" style={{ color: "#FF4444" }}>
            Failed to load queue: {error.message}
          </p>
        </div>
      ) : (
        <CollabClient requests={requests} />
      )}
    </main>
  );
}
