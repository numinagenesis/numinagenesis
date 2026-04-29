export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { QueueClient, type PendingSubmission } from "./client";

export default async function QueuePage() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect("/admin");

  const { data, count, error } = await supabaseAdmin
    .from("submissions")
    .select(
      "id, wallet_address, tweet_url, points_awarded, created_at, raw_data",
      { count: "exact" }
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);

  const submissions: PendingSubmission[] = (data ?? []) as PendingSubmission[];
  const total = count ?? 0;

  return (
    <main className="px-4 sm:px-6 py-12 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="pixel text-[7px] text-dim mb-2">// NUMINA ADMIN</p>
          <h1
            className="pixel"
            style={{ fontSize: "clamp(14px,2.5vw,20px)", color: "#FFFFFF" }}
          >
            MODERATION QUEUE
          </h1>
          {total > 0 && (
            <p className="mono text-xs mt-2" style={{ color: "#aaaa44" }}>
              {total} submission{total !== 1 ? "s" : ""} pending review
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
        <span className="pixel text-[7px] text-dim">PENDING</span>
        <hr className="chain-border flex-1" />
      </div>

      {error ? (
        <div
          className="numina-card bracketed"
          style={{ padding: "24px", background: "#040404" }}
        >
          <p className="mono text-xs" style={{ color: "#FF4444" }}>
            Failed to load queue: {error.message}
          </p>
        </div>
      ) : (
        <QueueClient submissions={submissions} />
      )}
    </main>
  );
}
