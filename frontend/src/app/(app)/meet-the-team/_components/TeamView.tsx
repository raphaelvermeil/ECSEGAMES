"use client";

import { useState } from "react";
import { CREWS, type TeamMember } from "@/lib/team";
import CampScene from "./CampScene";
import CampSceneMobile from "./CampSceneMobile";
import ScaledScene from "./ScaledScene";
import TeamBanner from "./TeamBanner";
import TeamDetailPanel from "./TeamDetailPanel";

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
  const [selectedId, setSelectedId] = useState(members[0]?.id ?? null);
  const selected = members.find((m) => m.id === selectedId) ?? members[0];

  // The column's own background matches TeamDetailPanel's, so if the page ever
  // ends up a hair taller than the panel reaches, the sliver below it blends
  // into the panel instead of showing the shell's near-black.
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0f1512] lg:h-auto lg:overflow-visible lg:min-h-[max(calc(100vh-72px),calc(var(--app-floor-h,72px)-72px))]">
      <TeamBanner
        subtitle={`${members.length} coords · tap a head to learn more`}
      />

      {/* grow/shrink/basis-0/min-h-0 (instead of flex-1's percentage basis)
          hands ScaledScene the exact leftover box — see ScaledScene for why
          a plain flex-1 forces this taller than that box on some
          resolutions. ScaledScene fits itself to whichever dimension of that
          box is tighter and tints any slack on the other axis, so the detail
          panel below always sits flush against the bottom of the viewport
          and never overlaps the scene. */}
      <div className="hidden grow shrink basis-0 min-h-0 lg:flex">
        <ScaledScene>
          <CampScene
            members={members}
            selectedId={selected?.id ?? null}
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

      {/* Takes whatever height the banner above and the detail panel below
          leave over, so the phone layout is exactly one screen tall. */}
      <div className="grow shrink basis-0 min-h-0 bg-sched-bg lg:hidden">
        <CampSceneMobile
          members={members}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
        />
      </div>

      {selected && <TeamDetailPanel member={selected} />}
    </div>
  );
}
