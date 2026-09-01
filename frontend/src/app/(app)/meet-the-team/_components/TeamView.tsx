"use client";

import { useEffect, useState } from "react";
import type { TeamMember } from "@/lib/team";
import CampScene from "./CampScene";
import CampSceneMobile from "./CampSceneMobile";
import ScaledScene from "./ScaledScene";
import TeamBanner from "./TeamBanner";
import TeamMemberModal from "./TeamMemberModal";

// The old 90s period spent ~12.6s of every cycle with the sun dwelling below
// the horizon (invisible). ecSun's keyframes now confine that dwell to
// ~2s of the timeline; shortening the period to match keeps the visible
// arc's on-screen speed exactly what it was (90 - 12.6 = 77.4s of visible
// motion, plus the new 2s dwell = 79.4s).
const SUN_PERIOD_SECONDS = 79.4;

// The 72px in the root className is Navbar's fixed h-[72px] — without
// subtracting it, min-h-screen on this column would always leave a spare 72px
// for flex-1 to swallow, forcing a scrollbar even when the scene fits. Keep
// both occurrences in sync with Navbar.
//
// The max() against --app-floor-h is the zoom floor (see ViewportFloor): at or
// below the load-time viewport height the column keeps that height, so zooming
// in magnifies the scene and scrolls rather than squeezing the scene box down
// to a sliver. Zoomed out, the 100vh term wins and the scene expands to fill.
export default function TeamView({ members }: { members: TeamMember[] }) {
  // No one is selected until a head is clicked — TeamMemberModal renders
  // nothing while this is null, so nothing pops up on load.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = members.find((m) => m.id === selectedId) ?? null;

  // The phone column below is `fixed inset-0`, so it already covers the
  // viewport and nothing is out of reach — but the shell wrapping this page
  // still carries a min-height, and if a browser resolves that even slightly
  // taller than the visible area you can scroll a sliver of empty background.
  // Locking the document closes that last gap. Desktop is left alone: it
  // genuinely scrolls when zoomed in.
  useEffect(() => {
    const mql = window.matchMedia(
      "(min-width: 64rem), (hover: hover) and (pointer: fine)",
    );
    const root = document.documentElement;
    const apply = () => {
      root.style.overflow = mql.matches ? "" : "hidden";
    };
    apply();
    mql.addEventListener("change", apply);
    return () => {
      mql.removeEventListener("change", apply);
      root.style.overflow = "";
    };
  }, []);

  // On phones this column is `fixed inset-0`: the browser sizes it to exactly
  // the viewport it believes in, and — the important part — a fixed element is
  // out of flow, so it contributes nothing to the document's scroll height.
  // That makes scrolling structurally impossible rather than merely arithmetic
  // that has to come out exact, which is what kept going subtly wrong across
  // dvh/svh/innerHeight/visualViewport. Desktop reverts to static flow via
  // lg:, where the scene is meant to sit under the nav and the zoom floor
  // governs height.
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#0f1512] lg:static lg:h-auto lg:overflow-visible lg:min-h-[max(calc(100vh-72px),calc(var(--app-floor-h,72px)-72px))]">
      <TeamBanner
        subtitle={`${members.length} coords · tap a head to learn more`}
      />

      {/* grow/shrink/basis-0/min-h-0 (instead of flex-1's percentage basis)
          hands ScaledScene the exact leftover box — see ScaledScene for why
          a plain flex-1 forces this taller than that box on some
          resolutions. ScaledScene fits itself to whichever dimension of that
          box is tighter and tints any slack on the other axis, so the scene
          fills the viewport all the way to the bottom now that there's no
          footer sharing the space. */}
      <div className="hidden grow shrink basis-0 min-h-0 lg:flex">
        <ScaledScene>
          <CampScene
            members={members}
            selectedId={selectedId}
            onSelect={setSelectedId}
            sun={{
              leftPct: 70,
              topPct: 26,
              animated: true,
              periodSeconds: SUN_PERIOD_SECONDS,
            }}
          />
        </ScaledScene>
      </div>

      {/* Takes whatever height the banner above leaves over, so the phone
          layout is exactly one screen tall. */}
      <div className="grow shrink basis-0 min-h-0 bg-sched-bg lg:hidden">
        <CampSceneMobile
          members={members}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      <TeamMemberModal member={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}
