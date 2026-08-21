"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Bell, Menu } from "@/components/icons";
import MobileNavMenu from "@/components/MobileNavMenu";

export default function ScheduleBanner({
  canManage,
  onAdd,
  dateRangeLabel,
}: {
  canManage: boolean;
  onAdd: () => void;
  dateRangeLabel?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile only — the shared Navbar is hidden on this route below lg,
          so its logo/bell/account row lives here instead: same chrome
          color as the Navbar, sitting above the green band rather than
          merged into it. */}
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

      <div className="relative flex items-center bg-sched-band px-5 pb-4 pt-5 lg:min-h-[180px] lg:px-10 lg:py-9">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.28]"
          style={{
            background:
              "repeating-linear-gradient(to bottom, rgba(0,0,0,.5) 0 1px, transparent 1px 3px)",
          }}
        />
        <div className="relative w-full lg:flex lg:flex-1 lg:items-center lg:justify-between lg:gap-10">
          <div>
            <h1 className="font-display text-[40px] font-semibold leading-none tracking-[0.01em] text-sched-cream lg:text-[56px]">
              SCHEDULE
            </h1>
            <p className="mt-[9px] font-mono text-xs text-sched-accent lg:hidden">
              {dateRangeLabel ?? "Everything happening at the Games."}
            </p>
            <p className="mt-[14px] hidden font-mono text-[15px] text-sched-accent lg:block">
              Everything happening at the Games.
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={onAdd}
              className="hidden bg-sched-accent px-[22px] py-[14px] font-display text-[15px] font-semibold tracking-[0.06em] text-sched-fill transition-[filter] hover:brightness-[1.12] lg:inline-flex"
            >
              + ADD EVENT
            </button>
          )}
        </div>
      </div>

      <MobileNavMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
