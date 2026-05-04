"use client";

import { useState, useEffect } from "react";
import { DIVISIONS, type DivisionKey, type TierKey } from "@/lib/divisions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TaskRecord {
  id: string;
  input: string;
  output: string;
  fragments_earned: number;
  task_hash: string;
  created_at: string;
}

interface Props {
  division: DivisionKey;
  tier: TierKey;
  refreshKey?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function TaskModal({
  task,
  division,
  onClose,
}: {
  task: TaskRecord;
  division: DivisionKey;
  onClose: () => void;
}) {
  const div = DIVISIONS[division];

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.88)",
        zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="numina-card bracketed p-0"
        style={{
          maxWidth: 640, width: "100%",
          maxHeight: "80vh",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid #222222", background: "#080808", flexShrink: 0 }}
        >
          <div className="flex items-center gap-3">
            {div && (
              <span className="pixel text-[9px]" style={{ color: div.color }}>{div.icon}</span>
            )}
            <span className="pixel text-[7px] text-dim">// TASK RECORD</span>
          </div>
          <button
            onClick={onClose}
            className="mono text-[10px] text-dim"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: "auto", flexGrow: 1 }}>
          {/* Meta */}
          <div className="px-4 py-3 flex flex-col gap-1" style={{ borderBottom: "1px solid #222222" }}>
            {[
              ["TASK HASH",    task.task_hash.slice(0, 24) + "..."],
              ["FRAGMENTS",    `+${task.fragments_earned}`],
              ["TIMESTAMP",    new Date(task.created_at).toLocaleString()],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <span className="mono text-[10px] text-dim shrink-0">{k}</span>
                <span className="mono text-[10px] text-primary text-right">{v}</span>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #222222" }}>
            <p className="pixel text-[7px] text-dim mb-2">// INPUT</p>
            <p className="mono text-[11px] leading-relaxed" style={{ color: "#AAAAAA", whiteSpace: "pre-wrap" }}>
              {task.input}
            </p>
          </div>

          {/* Output */}
          <div className="px-4 py-3">
            <p className="pixel text-[7px] text-dim mb-2">// OUTPUT</p>
            <p className="mono text-[11px] leading-relaxed" style={{ color: "#FFFFFF", whiteSpace: "pre-wrap" }}>
              {task.output}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TaskHistory ───────────────────────────────────────────────────────────────

export default function TaskHistory({ division, tier: _tier, refreshKey = 0 }: Props) {
  const [tasks,    setTasks]    = useState<TaskRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<TaskRecord | null>(null);

  const div = DIVISIONS[division];

  useEffect(() => {
    setLoading(true);
    fetch("/api/forge/history")
      .then((r) => (r.ok ? r.json() : { tasks: [] }))
      .then((data) => setTasks(data.tasks ?? []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="numina-card bracketed p-5 text-center">
        <p className="pixel text-[7px] text-dim">LOADING<span className="blink">...</span></p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="numina-card bracketed p-6 text-center flex flex-col gap-2">
        <p className="pixel text-[7px] text-dim">// HISTORY</p>
        <p className="mono text-[11px] text-muted mt-2">No tasks yet. Deploy your first task.</p>
      </div>
    );
  }

  return (
    <>
      <div className="numina-card bracketed p-0">
        <div className="px-4 py-2" style={{ borderBottom: "1px solid #222222", background: "#080808" }}>
          <p className="pixel text-[7px] text-dim">// HISTORY — LAST {tasks.length}</p>
        </div>

        <div className="flex flex-col">
          {tasks.map((task, i) => (
            <button
              key={task.id}
              onClick={() => setSelected(task)}
              className="flex items-center gap-3 px-4 py-3 text-left w-full"
              style={{
                background: "transparent",
                border: "none",
                borderBottom: i < tasks.length - 1 ? "1px solid #111111" : "none",
                cursor: "pointer",
              }}
            >
              {/* Division badge */}
              <span
                className="pixel text-[10px] shrink-0"
                style={{ color: div?.color ?? "#666666", width: 14, textAlign: "center" }}
              >
                {div?.icon ?? "◈"}
              </span>

              {/* Input preview */}
              <span
                className="mono text-[10px] flex-1 truncate"
                style={{ color: "#AAAAAA" }}
              >
                {task.input.length > 40 ? task.input.slice(0, 40) + "…" : task.input}
              </span>

              {/* Fragments */}
              <span className="pixel text-[7px] shrink-0" style={{ color: "#FFFFFF" }}>
                +{task.fragments_earned}
              </span>

              {/* Timestamp */}
              <span className="mono text-[9px] text-dim shrink-0">
                {relativeTime(task.created_at)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <TaskModal
          task={selected}
          division={division}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
