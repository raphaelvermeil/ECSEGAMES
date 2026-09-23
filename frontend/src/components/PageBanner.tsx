"use client";

import { useState } from "react";
import MobileChromeBar from "@/components/MobileChromeBar";
import MobileNavMenu from "@/components/MobileNavMenu";

// The title band for every non-Schedule page — the shared mobile chrome bar
// plus the green band + pixel title treatment, sized to match ScheduleBanner
// at both breakpoints so the app doesn't switch visual language between tabs.
export default function PageBanner({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    // Deliberately a Fragment rather than a wrapper div: `position: sticky`
    // is bounded by its parent's box, so wrapping the banner would let the
    // chrome bar unpin the moment that short wrapper scrolled past.
    <>
      <MobileChromeBar
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((o) => !o)}
      />

      <div className="relative flex items-center bg-sched-band px-5 pb-4 pt-5 lg:min-h-[180px] lg:px-10 lg:py-9">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.28]"
          style={{
            background:
              "repeating-linear-gradient(to bottom, rgba(0,0,0,.5) 0 1px, transparent 1px 3px)",
          }}
        />
        <div className="relative">
          <h1 className="font-display text-[40px] font-semibold leading-none tracking-[0.01em] text-sched-cream lg:text-[56px]">
            {title}
          </h1>
          <p className="mt-[9px] font-mono text-xs text-sched-accent lg:mt-[14px] lg:text-[15px]">
            {subtitle}
          </p>
        </div>
      </div>

      <MobileNavMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
