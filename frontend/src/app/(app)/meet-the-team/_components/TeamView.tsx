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

// Matches Navbar's fixed h-[72px] — without subtracting it, min-h-screen on
// this column would always leave a spare 72px for flex-1 to swallow, forcing
// a scrollbar even when the scene fits.
export default function TeamView({ members }: { members: TeamMember[] }) {
  const [selectedId, setSelectedId] = useState(members[0]?.id ?? null);
  const selected = members.find((m) => m.id === selectedId) ?? members[0];

  // The column's own background matches TeamDetailPanel's, so if the page ever
  // ends up a hair taller than the panel reaches, the sliver below it blends
  // into the panel instead of showing the shell's near-black.
  return (
    <div className="flex flex-col bg-[#0f1512] lg:min-h-[calc(100vh-72px)]">
      <TeamBanner
        subtitle={`${members.length} coords · ${CREWS.length} crews · tap a head to open their LinkedIn`}
      />

      {/* flex-1 absorbs any leftover height so the detail panel below always
          sits flush against the bottom of the viewport instead of leaving a
          gap, no matter how tall the screen is.

          On tall viewports that leftover shows above and below the scene (the
          scene is scaled by width, so its height is fixed by its aspect
          ratio). items-center splits it evenly, which puts this gradient's
          50% line behind the opaque scene — so the band above paints the
          scene's own top row and the band below its own bottom row, reading
          as more sky and more grass rather than as empty bars. Keep these two
          hex values in sync with the first and last full-bleed entries in
          CampScene's SCENE_DECOR. */}
      <div
        className="hidden flex-1 items-center lg:flex"
        style={{
          background:
            "linear-gradient(#233b52 0%, #233b52 50%, #1f4831 50%, #1f4831 100%)",
        }}
      >
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

      <div className="bg-sched-bg lg:hidden">
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
