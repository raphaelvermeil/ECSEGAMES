"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Bell, Menu } from "@/components/icons";
import MobileNavMenu from "@/components/MobileNavMenu";

// Mobile-only header for every non-Schedule page — same black top bar +
// green band + pixel title treatment as ScheduleBanner's mobile header, so
// the app doesn't switch visual language between tabs on a phone. Desktop
// is untouched: each page keeps its own existing desktop layout below this.
export default function MobilePageBanner({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between gap-3 bg-sched-chrome px-4 py-3">
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

      <div className="relative flex items-center bg-sched-band px-5 pb-4 pt-5">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.28]"
          style={{
            background:
              "repeating-linear-gradient(to bottom, rgba(0,0,0,.5) 0 1px, transparent 1px 3px)",
          }}
        />
        <div className="relative">
          <h1 className="font-display text-[40px] font-semibold leading-none tracking-[0.01em] text-sched-cream">
            {title}
          </h1>
          <p className="mt-[9px] font-mono text-xs text-sched-accent">
            {subtitle}
          </p>
        </div>
      </div>

      <MobileNavMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
