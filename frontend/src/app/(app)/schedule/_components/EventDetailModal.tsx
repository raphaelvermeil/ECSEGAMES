"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Clock, Pin, X } from "@/components/icons";
import type { ScheduleEvent } from "@/lib/events";
import { useScrollLock, useThemeColor } from "@/lib/overlay";
import {
  categoryColor,
  formatFooterTimestamp,
  formatModalDate,
  formatModalDateRange,
  formatTime,
  isOngoing,
  withAlpha,
} from "@/lib/schedule";
import EventHistoryView from "./EventHistoryView";
import ScoringPanel from "./ScoringPanel";

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
  const [tab, setTab] = useState<"detail" | "history">("detail");

  // Only the sheet scrolls while it is open; the schedule behind it holds
  // its place. The tint is this overlay's rgba(4,9,7,.72) composited over
  // the header it covers (--color-sched-chrome), so Safari's address bar
  // stays the same shade as the top of the screen instead of reverting to
  // the undimmed header colour.
  useScrollLock();
  useThemeColor("#0a0e0c");

  // Focus the panel on open, and hand focus back to whatever triggered it
  // (the calendar row/rail item) on close.
  //
  // preventScroll matters here. On a phone this is a bottom sheet that
  // animates up from translateY(100%), so at the instant focus lands the
  // panel is still entirely below the viewport — and a plain focus() makes
  // the browser scroll its scrollable ancestors to reveal it, which parks
  // the overlay at the panel's bottom. The result was a flash of the end of
  // the description at the top of the screen before the animation finished
  // and everything snapped back. The sheet is positioned by CSS; focus has
  // no business moving it.
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });
    return () => trigger?.focus?.();
  }, []);

  // Re-focus the panel whenever the detail/history content swaps out from
  // under the user, so keyboard/screen-reader users don't lose their place.
  // Same reasoning on preventScroll — and note this also runs on mount, so
  // without it the panel was being scrolled into view twice.
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, [tab]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      // Filter to actually-visible elements: ScoringPanel renders a desktop
      // and a mobile block for every row (one hidden via `display:none` at
      // the current breakpoint), so the raw query below matches each
      // focusable twice — .focus() on a hidden one is a silent no-op that
      // would otherwise let focus escape the trap.
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetWidth || el.offsetHeight);
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
  const footLabel = `Created ${formatFooterTimestamp(event.createdAt)}`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto p-0 backdrop-blur-[4px] lg:items-start lg:px-5 lg:py-14"
      style={{ background: "rgba(4,9,7,.72)" }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Event detail"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        // 88svh rather than 88%: a percentage max-height resolves against the
        // overlay's own resolved height, and on iOS that settles a frame late
        // while the URL bar animates. Until it does, the sheet is at its
        // natural height — and because the overlay is `items-end`, anything
        // taller than it gets pushed out of the *top*, which is what put the
        // end of the description at the top of the screen for a frame. svh is
        // the smallest-viewport unit, so it resolves immediately and doesn't
        // move when the URL bar collapses; it's the same reason the shell uses
        // svh rather than vh (see (app)/layout.tsx).
        className="animate-sched-sheet max-h-[88svh] w-full overflow-y-auto overscroll-contain border-t border-sched-accent-dim bg-sched-bg-raised pb-[var(--app-safe-bottom)] font-mono outline-none lg:animate-sched-pop lg:max-h-none lg:max-w-[780px] lg:overflow-visible lg:border lg:pb-0"
      >
        <div
          aria-hidden="true"
          className="mx-auto mt-2 h-1 w-[42px] rounded-full bg-sched-accent-dim lg:hidden"
        />
        {tab === "history" ? (
          <EventHistoryView
            eventId={event.id}
            eventTitle={event.title}
            onBack={() => setTab("detail")}
            onClose={onClose}
          />
        ) : (
          <>
            <div className="border-b border-sched-hair px-5 pb-[22px] pt-[26px] lg:px-[30px]">
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
                      className="hidden border border-sched-hair px-[14px] py-[7px] font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-sched-accent transition-colors hover:border-sched-accent lg:inline-flex"
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
              <h2 className="mt-[18px] text-pretty font-display text-[28px] font-semibold leading-[1.08] text-sched-cream lg:text-[38px]">
                {event.title}
              </h2>
              <div className="mt-[18px] flex flex-col gap-[9px] lg:flex-row lg:flex-wrap lg:gap-[22px]">
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

            <div className="px-5 pb-[6px] pt-6 lg:px-[30px]">
              <p className="max-w-[62ch] text-pretty text-sm leading-[1.75] text-sched-text">
                {event.longDescription}
              </p>
            </div>

            {(event.access || event.captain) && (
              <div className="flex flex-col gap-4 px-5 pb-6 pt-5 lg:grid lg:grid-cols-2 lg:gap-[22px] lg:px-[30px]">
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

            {canManage && (
              <ScoringPanel eventId={event.id} category={event.category} />
            )}

            {canManage && (
              <div className="px-5 pb-3 pt-1 lg:hidden">
                <button
                  type="button"
                  onClick={onEdit}
                  className="w-full border border-sched-hair px-[14px] py-[13px] font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-sched-accent transition-colors hover:border-sched-accent"
                >
                  Edit event
                </button>
              </div>
            )}

            {/* History is the scoring paper trail — which exec awarded what,
                by name — so it's exec/admin only on the backend now that the
                event itself is public. Hiding the link keeps a signed-out
                reader from clicking through to a guaranteed 401. */}
            {canManage && (
              <div className="border-t border-sched-hair px-5 pb-5 pt-4 lg:px-[30px]">
                <button
                  type="button"
                  onClick={() => setTab("history")}
                  className="font-mono text-[11px] text-sched-text-muted underline decoration-1 underline-offset-[3px] transition-colors hover:text-sched-accent"
                >
                  {footLabel}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
