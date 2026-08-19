"use client";

import { useEffect, useRef } from "react";
import { CalendarDays, Clock, Pin, X } from "@/components/icons";
import type { ScheduleEvent } from "@/lib/events";
import {
  categoryColor,
  formatFooterTimestamp,
  formatModalDate,
  formatModalDateRange,
  formatTime,
  isOngoing,
  withAlpha,
} from "@/lib/schedule";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function EventDetailModal({
  event,
  canManage,
  onClose,
  onEdit,
}: {
  event: ScheduleEvent;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus the panel on open, and hand focus back to whatever triggered it
  // (the calendar row/rail item) on close.
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => trigger?.focus?.();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables =
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      // Initial focus lands on the panel container itself (see the mount
      // effect above), not on `first` — treat that as the start of the
      // sequence too, or a Shift+Tab from there escapes the trap entirely.
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (active === last || active === panelRef.current)
      ) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const color = categoryColor(event.category);
  const ongoing = isOngoing(event);
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const dateLabel = ongoing
    ? formatModalDateRange(start, end)
    : formatModalDate(start);
  const timeLabel = ongoing
    ? "Open all weekend"
    : `${formatTime(start)} – ${formatTime(end)}`;
  const neverEdited = event.lastEditedAt === event.createdAt;
  const footLabel = neverEdited
    ? `Created by ${event.createdBy} · ${formatFooterTimestamp(event.createdAt)}`
    : `Last edited by ${event.lastEditedBy} · ${formatFooterTimestamp(event.lastEditedAt)}`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto px-5 py-14 backdrop-blur-[4px]"
      style={{
        background: "rgba(4,9,7,.72)",
        animation: "sched-fade 180ms ease-out",
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Event detail"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[780px] border border-sched-accent-dim bg-sched-bg-raised font-mono outline-none"
        style={{ animation: "sched-pop 180ms ease-out" }}
      >
        <div className="border-b border-sched-hair px-[30px] pb-[22px] pt-[26px]">
          <div className="flex items-start justify-between gap-5">
            <span
              className="flex items-center gap-2 border px-[11px] py-[5px] text-[10px] font-medium uppercase tracking-[0.12em]"
              style={{ borderColor: withAlpha(color, 0.4), color }}
            >
              <span
                className="block h-[7px] w-[7px]"
                style={{ background: color }}
              />
              {event.category}
            </span>
            <div className="flex items-center gap-[10px]">
              {canManage && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="border border-sched-hair px-[14px] py-[7px] font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-sched-accent transition-colors hover:border-sched-accent"
                >
                  Edit event
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center border border-sched-hair text-sched-text-muted transition-colors hover:border-sched-accent hover:text-sched-accent"
              >
                <X width={14} height={14} strokeWidth={2} />
              </button>
            </div>
          </div>
          <h2 className="mt-[18px] text-pretty font-display text-[38px] font-semibold leading-[1.08] text-sched-cream">
            {event.title}
          </h2>
          <div className="mt-[18px] flex flex-wrap gap-[22px]">
            <span className="flex items-center gap-2 text-xs text-sched-text-muted">
              <CalendarDays
                width={14}
                height={14}
                strokeWidth={1.7}
                className="text-sched-accent-dim"
              />
              {dateLabel}
            </span>
            <span className="flex items-center gap-2 text-xs text-sched-text-muted">
              <Clock
                width={14}
                height={14}
                strokeWidth={1.7}
                className="text-sched-accent-dim"
              />
              {timeLabel}
            </span>
            <span className="flex items-center gap-2 text-xs text-sched-text-muted">
              <Pin
                width={14}
                height={14}
                strokeWidth={1.7}
                className="text-sched-accent-dim"
              />
              {event.location}
            </span>
          </div>
        </div>

        <div className="px-[30px] pb-[6px] pt-6">
          <p className="max-w-[62ch] text-pretty text-sm leading-[1.75] text-sched-text">
            {event.longDescription}
          </p>
        </div>

        {(event.access || event.captain) && (
          <div className="grid grid-cols-2 gap-[22px] px-[30px] pb-6 pt-5">
            <div>
              <h3 className="mb-[10px] text-[10px] font-medium tracking-[0.16em] text-sched-accent-dim">
                ACCESS &amp; SUSTAINABILITY
              </h3>
              <p className="text-pretty text-[13px] leading-[1.7] text-sched-text-muted">
                {event.access || "—"}
              </p>
            </div>
            <div>
              <h3 className="mb-[10px] text-[10px] font-medium tracking-[0.16em] text-sched-accent-dim">
                CAPTAIN&apos;S ROLE
              </h3>
              <p className="text-pretty text-[13px] leading-[1.7] text-sched-text-muted">
                {event.captain || "—"}
              </p>
            </div>
          </div>
        )}

        <div className="border-t border-sched-hair px-[30px] pb-5 pt-4">
          <p className="text-[11px] text-sched-text-muted underline decoration-1 underline-offset-[3px]">
            {footLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
