"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { X } from "@/components/icons";
import api from "@/lib/api";
import type { AuditEntry } from "@/lib/history";
import { verbColor } from "@/lib/history";
import { formatFooterTimestamp } from "@/lib/schedule";

// "Starts"/"Ends" diffs carry RFC3339 timestamps (from the backend's
// time.Time.Format) rather than human-readable text — reformat just those.
function formatDiffValue(label: string, value: string): string {
  if (label !== "Starts" && label !== "Ends") return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : formatFooterTimestamp(d.toISOString());
}

export default function EventHistoryView({
  eventId,
  eventTitle,
  onBack,
  onClose,
}: {
  eventId: string;
  eventTitle: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const { getToken } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const res = await api.get<AuditEntry[]>(
          `/api/events/${eventId}/history`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!cancelled) setEntries(res.data);
      } catch {
        if (!cancelled) setError("Could not load history. Please try again.");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [eventId, getToken]);

  return (
    <div>
      {/* Mobile — stacked header with a labelled BACK link, single-column
          rows. Structurally different from desktop (icon-only bordered
          buttons, side-by-side rows), not just a resized version of it. */}
      <div className="px-5 pb-[26px] pt-2 lg:hidden">
        <div className="flex items-center justify-between gap-[10px]">
          <button
            type="button"
            onClick={onBack}
            className="flex min-h-11 items-center gap-2 font-mono text-[10px] font-medium tracking-[0.14em] text-sched-accent"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M15 5 8 12l7 7" />
            </svg>
            BACK
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center text-sched-text-muted transition-colors hover:text-sched-accent"
          >
            <X width={16} height={16} strokeWidth={2} />
          </button>
        </div>
        <div className="mt-[6px] font-mono text-[10px] font-medium tracking-[0.18em] text-sched-accent-dim">
          HISTORY
        </div>
        <div className="mt-[6px] font-mono text-sm text-sched-cream">
          {eventTitle}
        </div>

        <div className="mt-[14px]">
          {error && (
            <p className="py-6 font-mono text-xs text-sched-coral">{error}</p>
          )}
          {!error && entries === null && (
            <p className="py-6 font-mono text-xs text-sched-text-muted">
              Loading…
            </p>
          )}
          {!error && entries !== null && entries.length === 0 && (
            <p className="py-6 font-mono text-xs text-sched-text-muted">
              Nothing recorded yet.
            </p>
          )}
          {entries?.map((h) => (
            <div
              key={h.id}
              className="border-t border-[rgba(63,143,87,.18)] py-[13px]"
            >
              <span
                className="font-mono text-[9px] font-medium uppercase tracking-[0.14em]"
                style={{ color: verbColor(h.verb) }}
              >
                {h.verb}
              </span>
              <div className="mt-[7px] font-mono text-xs leading-[1.6] text-sched-text">
                {h.text}
              </div>
              {h.diffs?.map((d, i) => (
                <div
                  key={i}
                  className="mt-2 flex flex-wrap items-center gap-[7px] font-mono text-[11px]"
                >
                  <span className="text-sched-text-muted">{d.label}</span>
                  <span className="text-sched-text-muted line-through">
                    {formatDiffValue(d.label, d.from)}
                  </span>
                  <span className="text-sched-accent-dim">-&gt;</span>
                  <span className="text-sched-cream">
                    {formatDiffValue(d.label, d.to)}
                  </span>
                </div>
              ))}
              <div className="mt-[7px] font-mono text-[10px] text-sched-text-muted">
                {h.actor} · {formatFooterTimestamp(h.at)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop — bordered header bar, icon-only buttons, 2-column rows. */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between gap-4 border-b border-sched-hair px-[30px] py-[22px]">
          <div className="flex items-center gap-[14px]">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to event"
              className="flex h-8 w-8 items-center justify-center border border-sched-hair text-sched-accent transition-colors hover:border-sched-accent"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="M15 5 8 12l7 7" />
              </svg>
            </button>
            <div>
              <div className="font-mono text-[11px] font-medium tracking-[0.18em] text-sched-accent-dim">
                HISTORY
              </div>
              <div className="mt-1 font-mono text-[13px] text-sched-cream">
                {eventTitle}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center border border-sched-hair text-sched-text-muted transition-colors hover:border-sched-accent hover:text-sched-accent"
          >
            <X width={14} height={14} strokeWidth={2} />
          </button>
        </div>

        <div className="px-[30px] pb-[26px] pt-[10px]">
          {error && (
            <p className="py-6 font-mono text-xs text-sched-coral">{error}</p>
          )}
          {!error && entries === null && (
            <p className="py-6 font-mono text-xs text-sched-text-muted">
              Loading…
            </p>
          )}
          {!error && entries !== null && entries.length === 0 && (
            <p className="py-6 font-mono text-xs text-sched-text-muted">
              Nothing recorded yet.
            </p>
          )}
          {entries?.map((h) => (
            <div
              key={h.id}
              className="grid gap-4 border-b border-[rgba(63,143,87,.18)] py-[14px]"
              style={{ gridTemplateColumns: "96px minmax(0,1fr)" }}
            >
              <span
                className="font-mono text-[10px] font-medium uppercase tracking-[0.14em]"
                style={{ color: verbColor(h.verb) }}
              >
                {h.verb}
              </span>
              <span className="min-w-0">
                <span className="block font-mono text-[13px] text-sched-text">
                  {h.text}
                </span>
                {h.diffs?.map((d, i) => (
                  <span
                    key={i}
                    className="mt-2 flex flex-wrap items-center gap-[9px] font-mono text-xs"
                  >
                    <span className="text-sched-text-muted">{d.label}</span>
                    <span className="text-sched-text-muted line-through">
                      {formatDiffValue(d.label, d.from)}
                    </span>
                    <span className="text-sched-accent-dim">-&gt;</span>
                    <span className="text-sched-cream">
                      {formatDiffValue(d.label, d.to)}
                    </span>
                  </span>
                ))}
                <span className="mt-[7px] block font-mono text-[11px] text-sched-text-muted">
                  {h.actor} · {formatFooterTimestamp(h.at)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
