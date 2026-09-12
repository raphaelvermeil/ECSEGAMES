"use client";

import type { ClockAction, ClockView } from "@/lib/cscomp-api";

// The exec's grip on the comp clock. It sits with the countdown it drives
// rather than on a separate admin screen — whoever is running the room is
// looking at the same banner as everyone else, and the clock they change
// is the clock every student sees.
//
// Only rendered for execs and admins; the backend enforces the same rule
// on POST /api/cscomp/clock, so hiding this is convenience, not security.

const ADJUSTMENTS = [
  { label: "−5", seconds: -300, title: "Take five minutes off" },
  { label: "−1", seconds: -60, title: "Take one minute off" },
  { label: "+1", seconds: 60, title: "Add one minute" },
  { label: "+5", seconds: 300, title: "Add five minutes" },
];

export default function ClockControls({
  clock,
  busy,
  onAction,
}: {
  clock: ClockView | null;
  busy: boolean;
  onAction: (action: ClockAction, seconds?: number) => void;
}) {
  if (!clock) return null;

  const running = clock.status === "running";
  // Start doubles as resume, and reads as such once time has been put on
  // the clock and paused.
  const startLabel = clock.status === "paused" ? "RESUME" : "START";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[9px] tracking-[0.18em] text-sched-text-muted">
        EXEC
      </span>

      <button
        type="button"
        onClick={() => onAction(running ? "pause" : "start")}
        disabled={busy}
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
        title="Halt the round and reset the clock to a full comp"
        className="min-h-9 border border-sched-coral px-3.5 font-mono text-[10px] font-medium tracking-[0.14em] text-sched-coral transition-colors hover:bg-sched-coral hover:text-[#1a0e08] disabled:cursor-not-allowed disabled:opacity-40"
      >
        STOP
      </button>

      <span className="mx-1 h-5 w-px bg-sched-hair" aria-hidden="true" />

      {ADJUSTMENTS.map((a) => (
        <button
          key={a.seconds}
          type="button"
          onClick={() => onAction("adjust", a.seconds)}
          disabled={busy || (a.seconds < 0 && clock.remainingSeconds === 0)}
          title={a.title}
          className="min-h-9 min-w-[42px] border border-sched-hair px-2.5 font-mono text-[10px] font-medium tracking-[0.14em] text-sched-text-muted transition-colors hover:border-sched-accent-dim hover:text-sched-cream disabled:cursor-not-allowed disabled:opacity-40"
        >
          {a.label}
        </button>
      ))}

      {clock.updatedBy && (
        <span className="font-mono text-[9px] tracking-[0.1em] text-sched-text-muted">
          last set by {clock.updatedBy}
        </span>
      )}
    </div>
  );
}
