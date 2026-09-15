"use client";

import { useState } from "react";
import { Lock } from "@/components/icons";
import ClockControls from "./ClockControls";
import type { ClockAction, ClockView } from "@/lib/cscomp-api";
import MobileChromeBar from "@/components/MobileChromeBar";
import MobileNavMenu from "@/components/MobileNavMenu";

type View = "teams" | "battle" | "mine" | "board";

// `open` tabs are readable before joining a team. The standings are one of
// them: the board is the thing a student checks before they have a squad.
const TABS: { view: View; label: string; open?: boolean }[] = [
  { view: "teams", label: "TEAMS", open: true },
  { view: "battle", label: "BATTLE" },
  { view: "mine", label: "MY TEAM" },
  { view: "board", label: "LIVE STANDINGS", open: true },
];

// How the shared clock's state reads under TIME LEFT. A stopped or paused
// round is worth saying outright — a frozen number with no label just
// looks like a broken timer.
const CLOCK_LABEL: Record<ClockView["status"], string> = {
  running: "TIME LEFT",
  paused: "PAUSED",
  stopped: "NOT STARTED",
};

export default function CsCompBanner({
  view,
  locked,
  clock,
  clockText,
  clockUrgent,
  canControlClock,
  clockBusy,
  onClockAction,
  solvedCount,
  totalParts,
  onSelectView,
}: {
  view: View;
  locked: boolean;
  clock: ClockView | null;
  clockText: string;
  clockUrgent: boolean;
  canControlClock: boolean;
  clockBusy: boolean;
  onClockAction: (action: ClockAction, seconds?: number) => void;
  solvedCount: number;
  totalParts: number;
  onSelectView: (v: View) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* The shared Navbar is hidden below lg, so this is the header on
          a phone — one component for every page, see MobileChromeBar. */}
      <MobileChromeBar
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((o) => !o)}
      />

      <div className="relative px-5 pb-0 pt-5 lg:px-[60px] lg:pt-[30px]">
        <div className="absolute inset-0 bg-sched-band" aria-hidden="true" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.26]"
          style={{
            background:
              "repeating-linear-gradient(to bottom, rgba(0,0,0,.5) 0 1px, transparent 1px 3px)",
          }}
        />
        <div className="relative flex flex-wrap items-end gap-[26px]">
          <div className="min-w-[260px] flex-1">
            <h1 className="font-display text-[32px] font-semibold leading-none tracking-[0.01em] text-sched-cream lg:text-[46px]">
              CS comp
            </h1>
            <p className="mt-3 font-mono text-xs text-sched-accent">
              In-house CSS battle · one file, HTML + CSS · recreate the target ·
              teams of 5
            </p>
          </div>
          <div className="flex gap-[26px] pb-1.5">
            <div>
              <div className="font-mono text-[9px] tracking-[0.18em] text-sched-text-muted">
                SOLVED
              </div>
              <div className="mt-[5px] font-mono text-lg font-medium text-sched-cream">
                {solvedCount} / {totalParts}
              </div>
            </div>
            <div>
              <div className="font-mono text-[9px] tracking-[0.18em] text-sched-text-muted">
                {clock ? CLOCK_LABEL[clock.status] : "TIME LEFT"}
              </div>
              <div
                className="mt-[5px] font-mono text-lg font-medium"
                style={{
                  color: clockUrgent
                    ? "#ff7b54"
                    : clock && clock.status !== "running"
                      ? "#7f9482"
                      : "#e9f5cd",
                }}
              >
                {clockText}
              </div>
            </div>
          </div>
        </div>

        {canControlClock && (
          <div className="relative mt-4">
            <ClockControls
              clock={clock}
              busy={clockBusy}
              onAction={onClockAction}
            />
          </div>
        )}

        <div
          className="relative mt-[26px] flex flex-wrap"
          role="tablist"
          aria-label="CS comp view"
        >
          {TABS.map((t) => {
            const active = view === t.view;
            const isLocked = locked && !t.open;
            return (
              <button
                key={t.view}
                type="button"
                role="tab"
                aria-selected={active}
                aria-disabled={isLocked}
                title={isLocked ? "Join a team of 5 first" : undefined}
                onClick={() => onSelectView(t.view)}
                className="flex min-h-[44px] items-center gap-2.5 border-l-0 border-b-0 border-t px-3.5 font-mono text-[11px] font-medium tracking-[0.14em] first:border-l lg:px-[22px] lg:text-xs"
                style={{
                  background: active ? "#0b1310" : "rgba(11,19,16,.35)",
                  color: active ? "#e9f5cd" : "#7f9482",
                  borderColor: isLocked
                    ? "rgba(63,143,87,.45)"
                    : "var(--color-sched-hair)",
                  borderLeftWidth: 1,
                  borderStyle: isLocked ? "dashed" : "solid",
                  cursor: isLocked ? "not-allowed" : "pointer",
                }}
              >
                {isLocked && (
                  <Lock
                    width={12}
                    height={14}
                    strokeWidth={1.4}
                    className="flex-none"
                  />
                )}
                {t.view === "board" && (
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 flex-none animate-pulse"
                    style={{ background: "#6ee787" }}
                  />
                )}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <MobileNavMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
