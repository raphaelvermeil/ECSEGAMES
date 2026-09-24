"use client";

import { useEffect, useState } from "react";
import type { ClockAction, ClockView } from "@/lib/cscomp-api";

// The exec's grip on the comp clock. It sits with the countdown it drives
// rather than on a separate admin screen — whoever is running the room is
// looking at the same banner as everyone else, and the clock they change
// is the clock every student sees.
//
// Only rendered for execs and admins; the backend enforces the same rule
// on POST /api/cscomp/clock, so hiding this is convenience, not security.

// Resolves a picked time of day into an absolute moment today, in the
// exec's own timezone. The server is handed that instant rather than the
// string "16:30", so it never has to guess a zone or a date.
function momentToday(value: string, now: number): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return null;
  const at = new Date(now);
  at.setHours(hours, minutes, 0, 0);
  return at;
}

// "16:30" for a Date, the shape the dropdown's values are keyed by.
function hhmm(at: Date): string {
  const hh = String(at.getHours()).padStart(2, "0");
  const mm = String(at.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// The same, for the instant the server reports.
function timeFieldValue(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return hhmm(at);
}

// How much round a finish leaves, so an exec can see the length without
// doing the subtraction.
function lengthFrom(now: number, at: Date): string {
  const mins = Math.max(0, Math.round((at.getTime() - now) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const SLOT_MINUTES = 15;
const WINDOW_HOURS = 6;

// The finishes on offer: every quarter hour from the next one, out to six
// hours or the end of the day, whichever comes first. It stops at midnight
// because a picked time is resolved against today — see momentToday — so an
// option past it would resolve into the past and be refused.
function slots(now: number): { value: string; label: string }[] {
  const first = new Date(now);
  first.setSeconds(0, 0);
  first.setMinutes(
    Math.floor(first.getMinutes() / SLOT_MINUTES) * SLOT_MINUTES + SLOT_MINUTES,
  );

  const today = new Date(now).getDate();
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < (WINDOW_HOURS * 60) / SLOT_MINUTES; i++) {
    const at = new Date(first.getTime() + i * SLOT_MINUTES * 60_000);
    if (at.getDate() !== today) break;
    out.push({
      value: hhmm(at),
      label: `${hhmm(at)} · ${lengthFrom(now, at)}`,
    });
  }
  return out;
}

export default function ClockControls({
  clock,
  busy,
  onAction,
}: {
  clock: ClockView | null;
  busy: boolean;
  onAction: (action: ClockAction, endsAt?: number) => void;
}) {
  // What the exec has typed, or null while the field is simply showing what
  // the clock is already pointed at. Deriving the displayed value rather
  // than copying the server's into state means a poll can never clobber a
  // half-typed time, and there is no effect keeping two copies in step.
  const [draft, setDraft] = useState<string | null>(null);
  // Reading the wall clock during render is impure, and this needs it to
  // tell whether a picked time has already gone by. So the current moment
  // is state, refreshed on a slow tick — a minute either way only affects
  // whether one button is disabled.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(tick);
  }, []);

  if (!clock) return null;

  // Until the exec touches the field it shows the end the clock already
  // has, so a second exec setting one from another screen shows up here.
  const endTime = draft ?? (clock.endsAt ? timeFieldValue(clock.endsAt) : "");

  // Whatever is already set has to stay selectable even when it is not on a
  // quarter hour, or opening the menu would silently blank it.
  const offered = slots(now);
  const options =
    endTime && !offered.some((o) => o.value === endTime)
      ? [...offered, { value: endTime, label: endTime }].sort((a, b) =>
          a.value.localeCompare(b.value),
        )
      : offered;

  const running = clock.status === "running";
  // Start doubles as resume, and reads as such once time has been put on
  // the clock and paused. A clock paused after running out has nothing to
  // resume (the server ignores the request), so the button is off until
  // STOP resets the round.
  const startLabel = clock.status === "paused" ? "RESUME" : "START";
  const expiredPause =
    clock.status === "paused" && clock.remainingSeconds === 0;

  // A time of day that has already gone by today is almost always a typo,
  // and the server rejects it, so the button says so before the round trip.
  const target = momentToday(endTime, now);
  const passed = target !== null && target.getTime() <= now;
  const canSet = target !== null && !passed;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[9px] tracking-[0.18em] text-sched-text-muted">
        EXEC
      </span>

      <button
        type="button"
        onClick={() => onAction(running ? "pause" : "start")}
        disabled={busy || expiredPause}
        title={expiredPause ? "Time ran out — press STOP to reset" : undefined}
        className="min-h-9 px-3.5 font-mono text-[10px] font-medium tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: running ? "none" : "#6ee787",
          border: `1px solid ${running ? "var(--color-sched-accent-dim)" : "#6ee787"}`,
          color: running ? "#6ee787" : "#0b1310",
        }}
      >
        {running ? "PAUSE" : startLabel}
      </button>

      <button
        type="button"
        onClick={() => onAction("stop")}
        disabled={busy || clock.status === "stopped"}
        title="Halt the round and reset the clock"
        className="min-h-9 border border-sched-coral px-3.5 font-mono text-[10px] font-medium tracking-[0.14em] text-sched-coral transition-colors hover:bg-sched-coral hover:text-[#1a0e08] disabled:cursor-not-allowed disabled:opacity-40"
      >
        STOP
      </button>

      {/* For a start pressed too early: stops the clock and hides the battle
          from students again, as if start had never been pressed. */}
      <button
        type="button"
        onClick={() => {
          if (
            window.confirm(
              "Stop the clock and hide the battle from students again?",
            )
          ) {
            onAction("rehide");
          }
        }}
        disabled={busy || !clock.started}
        title="Undo an early start: stop the clock and hide the battle again"
        className="min-h-9 border border-sched-coral px-3.5 font-mono text-[10px] font-medium tracking-[0.14em] text-sched-coral transition-colors hover:bg-sched-coral hover:text-[#1a0e08] disabled:cursor-not-allowed disabled:opacity-40"
      >
        REHIDE
      </button>

      {/* The standings go dark for students in the final hour; this brings
          them back for everyone, e.g. once the winners are announced. */}
      <button
        type="button"
        onClick={() => onAction("reveal")}
        disabled={busy || !clock.standingsHidden}
        title={
          clock.standingsHidden
            ? "Show the standings to everyone again"
            : "The standings are not hidden right now"
        }
        className="min-h-9 border border-sched-accent-dim px-3.5 font-mono text-[10px] font-medium tracking-[0.14em] text-sched-accent transition-colors hover:bg-[#16241c] hover:text-sched-cream disabled:cursor-not-allowed disabled:opacity-40"
      >
        REVEAL STANDINGS
      </button>

      <span className="mx-1 h-5 w-px bg-sched-hair" aria-hidden="true" />

      {/* When the comp runs until, rather than how long it lasts. Setting it
          does not start anything, so an exec can put the finish on the board
          while the room is still filling up. */}
      <label className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-sched-text-muted">
        RUNS UNTIL
        <select
          value={endTime}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
          aria-label="The time of day the comp runs until"
          // colorScheme keeps the native menu dark rather than a white
          // panel dropped on top of the comp's palette.
          style={{ colorScheme: "dark" }}
          className="min-h-9 border border-sched-hair bg-[#0d1712] px-2 font-mono text-[11px] text-sched-cream outline-none focus:border-sched-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">— pick a finish —</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => {
          if (target) onAction("setEnd", Math.floor(target.getTime() / 1000));
        }}
        disabled={busy || !canSet}
        title={
          passed
            ? "That time has already gone by today"
            : "Set when the comp runs until"
        }
        className="min-h-9 border border-sched-accent-dim px-3.5 font-mono text-[10px] font-medium tracking-[0.14em] text-sched-accent transition-colors hover:bg-[#16241c] hover:text-sched-cream disabled:cursor-not-allowed disabled:opacity-40"
      >
        SET END
      </button>

      {clock.updatedBy && (
        <span className="font-mono text-[9px] tracking-[0.1em] text-sched-text-muted">
          last set by {clock.updatedBy}
        </span>
      )}
    </div>
  );
}
