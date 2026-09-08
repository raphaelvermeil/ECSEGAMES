"use client";

import { useEffect, useState } from "react";
import { initials } from "@/lib/team";
import {
  COMP_MINUTES,
  LEVELS,
  TEAM_SIZE,
  TEAMS,
  TOTAL_PARTS,
  formatClock,
  partKey,
  roster,
  slots,
  starterCode,
  type CompMember,
  type CompTeam,
} from "@/lib/cs-comp";
import BattlePanel from "./BattlePanel";
import CsCompBanner from "./CsCompBanner";
import LevelPartPicker from "./LevelPartPicker";
import MyTeamPanel from "./MyTeamPanel";
import TeamsPanel from "./TeamsPanel";

type View = "teams" | "battle" | "mine";
type Picker = "levels" | number | null;

export default function CsCompView({
  me,
}: {
  me: { name: string; program: string };
}) {
  const [view, setView] = useState<View>("teams");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [level, setLevel] = useState(1);
  const [part, setPart] = useState(1);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [solved, setSolved] = useState<Record<string, boolean>>({});
  const [picker, setPicker] = useState<Picker>(null);
  const [diff, setDiff] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COMP_MINUTES * 60);

  useEffect(() => {
    const t = setInterval(
      () => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)),
      1000,
    );
    return () => clearInterval(t);
  }, []);

  const meMember: CompMember = {
    name: me.name,
    initials: initials(me.name),
    program: me.program,
  };

  const locked = teamId === null;
  const myTeam: CompTeam | null = TEAMS.find((t) => t.id === teamId) ?? null;

  function selectView(v: View) {
    if (v !== "teams" && locked) return;
    setView(v);
    setConfirming(false);
  }

  function joinTeam(team: CompTeam) {
    if (teamId === team.id) {
      setView("battle");
      return;
    }
    if (roster(team, meMember, teamId).length >= TEAM_SIZE) return;
    setTeamId(team.id);
    setView("battle");
    setConfirming(false);
  }

  function leaveTeam() {
    setTeamId(null);
    setView("teams");
    setConfirming(false);
  }

  const key = partKey(level, part);
  const lv = LEVELS[level - 1];
  const pt = lv.parts[part - 1];
  const code = codes[key] ?? starterCode(lv, pt);
  const isDone = !!solved[key];
  const solvedCount = Object.values(solved).filter(Boolean).length;

  function changeCode(value: string) {
    setCodes((c) => ({ ...c, [key]: value }));
  }
  function resetCode() {
    setCodes((c) => ({ ...c, [key]: starterCode(lv, pt) }));
  }
  function submitCode() {
    setSolved((s) => ({ ...s, [key]: true }));
  }
  function selectPart(l: number, p: number) {
    setLevel(l);
    setPart(p);
    setPicker(null);
  }

  return (
    <>
      <CsCompBanner
        view={view}
        locked={locked}
        clock={formatClock(secondsLeft)}
        clockUrgent={secondsLeft < 300}
        solvedCount={solvedCount}
        totalParts={TOTAL_PARTS}
        onSelectView={selectView}
      />

      {view === "teams" && (
        <TeamsPanel
          teamId={teamId}
          meMember={meMember}
          part={part}
          onJoin={joinTeam}
        />
      )}

      {view === "battle" && !locked && myTeam && (
        <BattlePanel
          lv={lv}
          pt={pt}
          myTeamName={myTeam.name}
          myTeamColor={myTeam.color}
          code={code}
          isDone={isDone}
          diff={diff}
          onToggleDiff={() => setDiff((d) => !d)}
          onChangeCode={changeCode}
          onReset={resetCode}
          onSubmit={submitCode}
          onOpenPicker={() => setPicker("levels")}
        />
      )}

      {view === "mine" && !locked && myTeam && (
        <MyTeamPanel
          team={myTeam}
          rows={slots(myTeam, meMember, teamId, part)}
          solvedCount={solvedCount}
          totalParts={TOTAL_PARTS}
          levelPartShort={`L${level}·P${part}`}
          partTitle={pt.title}
          confirming={confirming}
          onAskLeave={() => setConfirming(true)}
          onCancelLeave={() => setConfirming(false)}
          onLeave={leaveTeam}
        />
      )}

      {picker !== null && (
        <LevelPartPicker
          picker={picker}
          currentLevel={level}
          currentPart={part}
          solved={solved}
          roster={myTeam ? roster(myTeam, meMember, teamId) : []}
          meMember={meMember}
          onSelectLevel={(n) => setPicker(n)}
          onBackToLevels={() => setPicker("levels")}
          onSelectPart={selectPart}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}
