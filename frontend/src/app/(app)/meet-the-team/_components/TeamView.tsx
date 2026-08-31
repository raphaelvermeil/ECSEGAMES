"use client";

import { useState } from "react";
import { CREWS, type TeamMember } from "@/lib/team";
import CampScene from "./CampScene";
import CampSceneMobile from "./CampSceneMobile";
import ScaledScene from "./ScaledScene";
import TeamBanner from "./TeamBanner";
import TeamDetailPanel from "./TeamDetailPanel";

const SUN_PERIOD_SECONDS = 90;

// Matches Navbar's fixed h-[72px] — without subtracting it, min-h-screen on
// this column would always leave a spare 72px for flex-1 to swallow, forcing
// a scrollbar even when the scene fits.
export default function TeamView({ members }: { members: TeamMember[] }) {
  const [selectedId, setSelectedId] = useState(members[0]?.id ?? null);
  const selected = members.find((m) => m.id === selectedId) ?? members[0];

  return (
    <div className="flex flex-col lg:min-h-[calc(100vh-72px)]">
      <TeamBanner
        subtitle={`${members.length} coords · ${CREWS.length} crews · tap a head to open their LinkedIn`}
      />

      {/* flex-1 absorbs any leftover height so the detail panel below always
          sits flush against the bottom of the viewport instead of leaving a
          gap, no matter how tall the screen is. */}
      <div className="hidden flex-1 items-center bg-sched-bg lg:flex">
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
