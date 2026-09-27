"use client";

import { useState } from "react";
import type { ScuntsSettings } from "@/lib/scunts";

// "2026-09-27T17:00", the shape a datetime-local field reads and writes, in
// the viewer's own timezone.
function fieldValue(iso: string): string {
  const at = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

// When submissions close, for everyone, and (execs only) the controls to
// change it. The backend enforces the deadline; this only reports it.
export default function DeadlineBar({
  settings,
  closed,
  canManage,
  onSet,
}: {
  settings: ScuntsSettings | null;
  closed: boolean;
  canManage: boolean;
  onSet: (at: Date | null) => Promise<void>;
}) {
  // What the exec has picked, or null while the field shows the saved time.
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!settings) return null;
  const closesAt = settings.closesAt;
  if (!closesAt && !canManage) return null;

  const value = draft ?? (closesAt ? fieldValue(closesAt) : "");

  async function apply(at: Date | null) {
    setBusy(true);
    try {
      await onSet(at);
      setDraft(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border border-sched-hair px-3 py-2.5 font-mono text-[11px]">
      <span className={closed ? "text-sched-coral" : "text-sched-cream"}>
        {!closesAt
          ? "Submissions are open, with no closing time set."
          : closed
            ? "Submissions are closed."
            : `Submissions close ${new Date(closesAt).toLocaleString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}.`}
      </span>

      {canManage && (
        <>
          <span className="mx-1 h-5 w-px bg-sched-hair" aria-hidden="true" />
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => setDraft(e.target.value)}
            disabled={busy}
            aria-label="When submissions close"
            style={{ colorScheme: "dark" }}
            className="min-h-9 border border-sched-hair bg-sched-bg px-2 text-sched-cream disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => apply(new Date(value))}
            disabled={busy || !value}
            className="min-h-9 border border-sched-accent-dim px-3 uppercase tracking-[0.14em] text-sched-accent transition-colors hover:text-sched-cream disabled:opacity-40"
          >
            Set close
          </button>
          <button
            type="button"
            onClick={() => apply(null)}
            disabled={busy || !closesAt}
            className="min-h-9 border border-sched-hair px-3 uppercase tracking-[0.14em] text-sched-text-muted transition-colors hover:text-sched-cream disabled:opacity-40"
          >
            Clear
          </button>
          {settings.updatedBy && (
            <span className="text-[10px] text-sched-text-muted">
              last set by {settings.updatedBy}
            </span>
          )}
        </>
      )}
    </div>
  );
}
