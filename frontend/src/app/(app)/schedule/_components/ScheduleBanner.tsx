"use client";

import { useState } from "react";
import MobileChromeBar from "@/components/MobileChromeBar";
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
      {/* The shared Navbar is hidden below lg, so this is the header on a
          phone. It pins; the green band underneath scrolls away, which is
          why the schedule's day-tab row offsets itself by --app-chrome-h
          (see ScheduleView) rather than sticking at the true top. */}
      <MobileChromeBar onOpenMenu={() => setMenuOpen(true)} />

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
