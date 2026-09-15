"use client";

import { useState } from "react";
import MobileChromeBar from "@/components/MobileChromeBar";
import MobileNavMenu from "@/components/MobileNavMenu";

export default function TeamBanner({ subtitle }: { subtitle: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* The shared Navbar is hidden below lg, so this is the header on
          a phone — one component for every page, see MobileChromeBar. */}
      <MobileChromeBar
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((o) => !o)}
      />

      {/* Desktop drops the title band entirely so the scene gets the extra
          vertical room — the page title already lives in the nav's active
          tab up there. */}
      <div className="relative flex flex-none items-center bg-sched-band px-5 pb-4 pt-5 lg:hidden">
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
            Meet the team
          </h1>
          <p className="mt-[9px] font-mono text-xs text-sched-accent">
            {subtitle}
          </p>
        </div>
      </div>

      <MobileNavMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
