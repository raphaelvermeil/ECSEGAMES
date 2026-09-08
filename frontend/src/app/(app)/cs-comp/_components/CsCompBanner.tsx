"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Bell, Lock, Menu } from "@/components/icons";
import MobileNavMenu from "@/components/MobileNavMenu";

type View = "teams" | "battle" | "mine";

const TABS: { view: View; label: string }[] = [
  { view: "teams", label: "TEAMS" },
  { view: "battle", label: "BATTLE" },
  { view: "mine", label: "MY TEAM" },
];

export default function CsCompBanner({
  view,
  locked,
  clock,
  clockUrgent,
  solvedCount,
  totalParts,
  onSelectView,
}: {
  view: View;
  locked: boolean;
  clock: string;
  clockUrgent: boolean;
  solvedCount: number;
  totalParts: number;
  onSelectView: (v: View) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between gap-3 bg-sched-chrome px-4 py-3 lg:hidden">
        <div className="flex items-center gap-[9px]">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-sched-accent-dim font-mono text-[10px] font-semibold tracking-[0.05em] text-sched-accent-dim">
            ECSE
          </div>
          <span className="font-display text-[15px] font-semibold tracking-[0.2em] text-sched-cream">
            GAMES
          </span>
        </div>
        <div className="flex items-center gap-[6px]">
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center text-sched-accent"
          >
            <Bell width={21} height={21} strokeWidth={1.6} />
          </button>
          <UserButton />
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
            className="flex h-11 w-11 items-center justify-center text-sched-text-muted"
          >
            <Menu width={22} height={22} strokeWidth={1.8} />
          </button>
        </div>
      </div>

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
                TIME LEFT
              </div>
              <div
                className="mt-[5px] font-mono text-lg font-medium"
                style={{ color: clockUrgent ? "#ff7b54" : "#e9f5cd" }}
              >
                {clock}
              </div>
            </div>
          </div>
        </div>

        <div
          className="relative mt-[26px] flex"
          role="tablist"
          aria-label="CS comp view"
        >
          {TABS.map((t) => {
            const active = view === t.view;
            const isLocked = locked && t.view !== "teams";
            return (
              <button
                key={t.view}
                type="button"
                role="tab"
                aria-selected={active}
                aria-disabled={isLocked}
                title={isLocked ? "Join a team of 5 first" : undefined}
                onClick={() => onSelectView(t.view)}
                className="flex min-h-[44px] items-center gap-2.5 border-l-0 border-t border-b-0 px-[22px] font-mono text-xs font-medium tracking-[0.14em] first:border-l"
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
