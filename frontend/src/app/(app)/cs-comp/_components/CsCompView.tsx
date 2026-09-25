"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatClock, partKey, slots, teamColors } from "@/lib/cs-comp";
import {
  canControlClock,
  claimChallenge,
  controlClock,
  createTeam,
  fetchClock,
  fetchMe,
  fetchStandings,
  joinTeam,
  leaveTeam,
  listChallenges,
  listTeams,
  submitCode,
  unclaimChallenge,
  CLOCK_POLL_MS,
  PASS_THRESHOLD,
  STANDINGS_POLL_MS,
  type Challenge,
  type ClockAction,
  type ClockView,
  type Leaderboard,
  type MeView,
  type CompTeam,
  type SubmitResult,
} from "@/lib/cscomp-api";
import BattlePanel from "./BattlePanel";
import CsCompBanner from "./CsCompBanner";
import LevelPartPicker from "./LevelPartPicker";
import MyTeamPanel from "./MyTeamPanel";
import StandingsPanel from "./StandingsPanel";
import TeamsPanel from "./TeamsPanel";

export type View = "teams" | "battle" | "mine" | "board";
type Picker = "levels" | number | null;

// Turns an axios failure into something worth showing. The backend answers
// these routes in plain text (http.Error), so its body is already the
// message — fall back to a generic line when there isn't one.
function errorText(err: unknown, fallback: string): string {
  const res = (err as { response?: { data?: unknown } })?.response;
  const body = typeof res?.data === "string" ? res.data.trim() : "";
  return body || fallback;
}

function shortLabel(c: Challenge): string {
  return `L${c.level}·P${c.part}`;
}

export default function CsCompView() {
  const { getToken } = useAuth();

  const [view, setView] = useState<View>("teams");
  const [loadedChallenges, setChallenges] = useState<Challenge[]>([]);
  const [teams, setTeams] = useState<CompTeam[]>([]);
  const [me, setMe] = useState<MeView | null>(null);
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState<Picker>(null);
  const [diff, setDiff] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // The last submit's verdict, tagged with the challenge it was for so it
  // can't linger on the editor after the current part changes underneath it
  // (releasing a claim, for one, moves `current` without a pick).
  const [result, setResult] = useState<{
    id: string;
    res: SubmitResult;
  } | null>(null);
  const [clock, setClock] = useState<ClockView | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [clockBusy, setClockBusy] = useState(false);
  // When the server last told us the remaining time, and what it said. The
  // local countdown is derived from wall-clock time since then rather than
  // by decrementing once per interval tick, which drifts (and stalls under
  // background-tab throttling) and then snaps on the next poll.
  const [anchor, setAnchor] = useState<{
    at: number;
    remaining: number;
  } | null>(null);

  function syncClock(next: ClockView) {
    setClock(next);
    setSecondsLeft(next.remainingSeconds);
    setAnchor({ at: Date.now(), remaining: next.remainingSeconds });
  }

  // The clock is the server's, shared by everyone in the room and driven
  // by an exec. Poll it for authority, then tick down locally in between
  // so the seconds move at one per second instead of in five-second jumps.
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const token = await getToken();
        const next = await fetchClock(token);
        if (cancelled) return;
        syncClock(next);
      } catch {
        // A dropped poll keeps the last known clock ticking locally.
      }
    }
    poll();
    const t = setInterval(poll, CLOCK_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [getToken]);

  useEffect(() => {
    if (clock?.status !== "running" || !anchor) return;
    const t = setInterval(
      () =>
        setSecondsLeft(
          Math.max(
            0,
            anchor.remaining - Math.floor((Date.now() - anchor.at) / 1000),
          ),
        ),
      1000,
    );
    return () => clearInterval(t);
  }, [clock?.status, anchor]);

  // Exec-only, and enforced server-side too — hiding the controls is
  // convenience, not the gate.
  async function onClockAction(action: ClockAction, endsAt = 0) {
    setClockBusy(true);
    setActionError(null);
    try {
      const token = await getToken();
      const next = await controlClock(token, action, endsAt);
      syncClock(next);
    } catch (err) {
      setActionError(errorText(err, "Could not change the clock."));
    } finally {
      setClockBusy(false);
    }
  }

  const refreshMe = useCallback(async () => {
    const token = await getToken();
    const [next, freshTeams] = await Promise.all([
      fetchMe(token),
      listTeams(token),
    ]);
    setMe(next);
    setTeams(freshTeams);
    return next;
  }, [getToken]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const [ts, mine] = await Promise.all([
          listTeams(token),
          fetchMe(token),
        ]);
        if (cancelled) return;
        setTeams(ts);
        setMe(mine);
        // A returning competitor lands on their team rather than the join
        // screen they already finished with. The battle is one tab over
        // once it is open.
        if (mine.team) setView("mine");
      } catch (err) {
        if (!cancelled) {
          setLoadError(errorText(err, "Could not load the CS comp."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  // In the comp's final hour the server keeps students off the standings
  // until an exec reveals them; execs keep the live board throughout.
  const boardHidden = !!clock?.standingsHidden && !canControlClock(me?.user);

  // The standings poll runs only while the board is on screen. Nothing
  // else on the page reads them, so polling in the background would be
  // load for its own sake.
  useEffect(() => {
    if (view !== "board" || boardHidden) return;
    let cancelled = false;
    async function poll() {
      try {
        const token = await getToken();
        const next = await fetchStandings(token);
        if (!cancelled) setBoard(next);
      } catch {
        // A dropped poll leaves the last board up rather than blanking it.
      }
    }
    poll();
    const t = setInterval(poll, STANDINGS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [view, boardHidden, getToken]);

  // The challenges stay hidden until the clock has been started once; execs
  // see them early. The server enforces this — the check here only decides
  // when to ask, so a student's page picks them up on the poll after start.
  const battleOpen = canControlClock(me?.user) || !!clock?.started;
  const haveChallenges = loadedChallenges.length > 0;

  // Everything below reads this, not what was loaded: once the battle is
  // closed (not started yet, or rehidden) the page behaves as if it holds
  // no challenges at all, whatever an earlier fetch left in memory.
  const challenges = useMemo(
    () => (battleOpen ? loadedChallenges : []),
    [battleOpen, loadedChallenges],
  );

  useEffect(() => {
    if (!battleOpen || haveChallenges) return;
    let cancelled = false;
    getToken()
      .then((token) => listChallenges(token))
      .then((cs) => {
        if (!cancelled) setChallenges(cs);
      })
      .catch(() => {
        // Left empty; the next clock poll re-runs this.
      });
    return () => {
      cancelled = true;
    };
  }, [battleOpen, haveChallenges, clock, getToken]);

  const colors = useMemo(() => teamColors(teams.map((t) => t.id)), [teams]);

  const byKey = useMemo(() => {
    const out: Record<string, Challenge> = {};
    for (const c of challenges) out[partKey(c.level, c.part)] = c;
    return out;
  }, [challenges]);

  const byId = useMemo(() => {
    const out: Record<string, Challenge> = {};
    for (const c of challenges) out[c.id] = c;
    return out;
  }, [challenges]);

  const challengeLabel = useCallback(
    (id: string) => {
      const c = byId[id];
      return c ? shortLabel(c) : "CLAIMED";
    },
    [byId],
  );

  // Team-wide progress: a challenge is solved for the whole team the
  // moment any teammate clears the threshold.
  const solved = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const s of me?.submissions ?? []) {
      if (s.matchPercent < PASS_THRESHOLD) continue;
      const c = byId[s.challengeId];
      if (c) out[partKey(c.level, c.part)] = true;
    }
    return out;
  }, [me, byId]);

  const myTeam = me?.team ?? null;
  const locked = myTeam === null;
  const myColor = myTeam ? (colors[myTeam.id] ?? "#6ee787") : "#7f9482";
  const solvedCount = Object.keys(solved).length;

  // Default selection: whatever this person has claimed, else part one.
  const current: Challenge | null = useMemo(() => {
    if (challengeId && byId[challengeId]) return byId[challengeId];
    const held = (me?.claims ?? []).find((c) => c.clerkId === me?.user.clerkId);
    if (held && byId[held.challengeId]) return byId[held.challengeId];
    return byKey[partKey(1, 1)] ?? challenges[0] ?? null;
  }, [challengeId, byId, byKey, challenges, me]);

  const myClaim = useMemo(
    () =>
      (me?.claims ?? []).find(
        (c) => c.challengeId === current?.id && c.clerkId === me?.user.clerkId,
      ) ?? null,
    [me, current],
  );

  const claimedByOther = useMemo(
    () =>
      (me?.claims ?? []).find(
        (c) => c.challengeId === current?.id && c.clerkId !== me?.user.clerkId,
      ) ?? null,
    [me, current],
  );

  const mineForCurrent = useMemo(() => {
    if (!current) return null;
    return (
      (me?.submissions ?? []).find(
        (s) => s.challengeId === current.id && s.clerkId === me?.user.clerkId,
      ) ?? null
    );
  }, [me, current]);

  // What the editor opens with, most recent first: anything typed this
  // session, then the code you last submitted, then the starter scaffold.
  //
  // The middle step is why leaving a part and coming back — or reloading
  // the page entirely — hands you your own solution again instead of a
  // blank scaffold. The server already keeps it (Submission.Code is your
  // best attempt, not your latest), so this is a read, not new storage.
  //
  // Only ever your own submission: a teammate's solve is on the same team
  // board, but it is not yours to open.
  const code =
    (current && codes[current.id]) ??
    mineForCurrent?.code ??
    current?.starterCode ??
    "";

  // Opening the battle or any part asks the server again rather than
  // trusting the list already on the page. A refusal closes the battle.
  async function verifyBattle(): Promise<Challenge[] | null> {
    try {
      const cs = await listChallenges(await getToken());
      setChallenges(cs);
      return cs;
    } catch (err) {
      setChallenges([]);
      setPicker(null);
      setView((v) => (v === "battle" ? "mine" : v));
      setActionError(errorText(err, "The battle is not open yet."));
      return null;
    }
  }

  function showView(v: View) {
    setView(v);
    setConfirming(false);
    setActionError(null);
  }

  function selectView(v: View) {
    // The board is readable before joining anything; the battle and the
    // roster are not.
    // Execs are the exception: they can preview the battle teamless.
    if (v !== "teams" && v !== "board" && locked) {
      if (!(v === "battle" && canControlClock(me?.user))) return;
    }
    if (v === "battle") {
      if (!battleOpen) return;
      verifyBattle().then((cs) => {
        if (cs) showView("battle");
      });
      return;
    }
    showView(v);
  }

  async function run(fn: () => Promise<void>, fallback: string) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(errorText(err, fallback));
    } finally {
      setBusy(false);
    }
  }

  function onJoin(team: CompTeam) {
    if (myTeam?.id === team.id) {
      setView("mine");
      return;
    }
    run(async () => {
      const token = await getToken();
      await joinTeam(token, team.id);
      await refreshMe();
      setView("mine");
    }, "Could not join that team.");
  }

  function onCreateTeam(name: string) {
    run(async () => {
      const token = await getToken();
      await createTeam(token, name);
      await refreshMe();
      setView("mine");
    }, "Could not create that team.");
  }

  function onLeave() {
    if (!myTeam) return;
    run(async () => {
      const token = await getToken();
      await leaveTeam(token, myTeam.id);
      await refreshMe();
      setView("teams");
      setConfirming(false);
    }, "Could not leave the team.");
  }

  function onClaim() {
    if (!current) return;
    run(async () => {
      const token = await getToken();
      await claimChallenge(token, current.id);
      await refreshMe();
    }, "Could not claim that part.");
  }

  function onUnclaim() {
    if (!current) return;
    run(async () => {
      const token = await getToken();
      await unclaimChallenge(token, current.id);
      await refreshMe();
    }, "Could not release that claim.");
  }

  function onSubmit() {
    if (!current) return;
    run(async () => {
      const token = await getToken();
      const res = await submitCode(token, current.id, code);
      setResult({ id: current.id, res });
      await refreshMe();
    }, "Could not submit that solution.");
  }

  function changeCode(value: string) {
    if (!current) return;
    setCodes((c) => ({ ...c, [current.id]: value }));
  }

  function resetCode() {
    if (!current) return;
    setCodes((c) => ({ ...c, [current.id]: current.starterCode }));
    setResult(null);
  }

  function selectPart(level: number, part: number) {
    setPicker(null);
    verifyBattle().then((cs) => {
      const c = cs?.find((x) => x.level === level && x.part === part);
      if (c) {
        setChallengeId(c.id);
        setResult(null);
      }
    });
  }

  if (loading) {
    return (
      <div className="bg-sched-bg px-5 py-20 text-center lg:px-[60px]">
        <p className="font-mono text-sm text-sched-text-muted">
          Loading the CS comp…
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-sched-bg px-5 py-20 text-center lg:px-[60px]">
        <p className="font-mono text-sm text-[#ff7b54]">{loadError}</p>
      </div>
    );
  }

  const roster = myTeam
    ? slots(
        myTeam.members,
        me?.user.clerkId ?? "",
        myColor,
        me?.claims ?? [],
        challengeLabel,
      )
    : [];

  return (
    <>
      <CsCompBanner
        view={view}
        locked={locked}
        battleLocked={!battleOpen}
        clock={clock}
        clockText={formatClock(secondsLeft)}
        clockUrgent={clock?.status === "running" && secondsLeft < 300}
        canControlClock={canControlClock(me?.user)}
        clockBusy={clockBusy}
        onClockAction={onClockAction}
        solvedCount={solvedCount}
        totalParts={challenges.length}
        onSelectView={selectView}
      />

      {actionError && (
        <div className="bg-sched-bg px-5 pt-4 lg:px-[60px]">
          <p
            className="border px-4 py-3 font-mono text-xs"
            style={{
              borderColor: "rgba(255,123,84,.4)",
              background: "rgba(255,123,84,.08)",
              color: "#ff7b54",
            }}
          >
            {actionError}
          </p>
        </div>
      )}

      {view === "teams" && (
        <TeamsPanel
          teams={teams}
          colors={colors}
          myTeamId={myTeam?.id ?? null}
          meClerkId={me?.user.clerkId ?? ""}
          claims={me?.claims ?? []}
          challengeLabel={challengeLabel}
          busy={busy}
          onJoin={onJoin}
          onCreate={onCreateTeam}
        />
      )}

      {view === "battle" && !locked && !battleOpen && (
        <div className="bg-sched-bg px-5 py-20 text-center lg:px-[60px]">
          <p className="font-mono text-sm text-sched-text-muted">
            The battle opens when the comp starts.
          </p>
        </div>
      )}

      {view === "battle" &&
        battleOpen &&
        current &&
        (myTeam || canControlClock(me?.user)) && (
          <BattlePanel
            challenge={current}
            preview={myTeam === null}
            myTeamName={myTeam?.name ?? ""}
            myTeamColor={myColor}
            code={code}
            solved={!!solved[partKey(current.level, current.part)]}
            best={mineForCurrent?.matchPercent ?? null}
            attempts={mineForCurrent?.attempts ?? 0}
            result={result && result.id === current.id ? result.res : null}
            claimedByMe={myClaim !== null}
            claimedByName={claimedByOther?.name ?? null}
            busy={busy}
            diff={diff}
            onToggleDiff={() => setDiff((d) => !d)}
            onChangeCode={changeCode}
            onReset={resetCode}
            onSubmit={onSubmit}
            onClaim={onClaim}
            onUnclaim={onUnclaim}
            onOpenPicker={() => setPicker("levels")}
          />
        )}

      {view === "mine" && !locked && myTeam && (
        <MyTeamPanel
          teamName={myTeam.name}
          teamColor={myColor}
          memberCount={myTeam.memberCount}
          rows={roster}
          solvedCount={solvedCount}
          totalParts={challenges.length}
          levelPartShort={current ? shortLabel(current) : "—"}
          partTitle={current?.name ?? "Nothing selected"}
          confirming={confirming}
          busy={busy}
          onAskLeave={() => setConfirming(true)}
          onCancelLeave={() => setConfirming(false)}
          onLeave={onLeave}
        />
      )}

      {view === "board" && boardHidden && (
        <div className="bg-sched-bg px-5 py-20 text-center lg:px-[60px]">
          <p className="font-mono text-sm text-sched-cream">
            The standings are hidden for the final hour.
          </p>
          <p className="mt-2 font-mono text-xs text-sched-text-muted">
            Keep solving the challenges! The winners will be revealed at the
            end.
          </p>
        </div>
      )}

      {view === "board" && !boardHidden && (
        <StandingsPanel
          board={board}
          colors={colors}
          myTeamId={myTeam?.id ?? null}
          challenges={challenges}
        />
      )}

      {picker !== null && battleOpen && (
        <LevelPartPicker
          picker={picker}
          challenges={challenges}
          currentLevel={current?.level ?? 1}
          currentPart={current?.part ?? 1}
          solved={solved}
          claims={me?.claims ?? []}
          meClerkId={me?.user.clerkId ?? ""}
          onSelectLevel={(n) => setPicker(n)}
          onBackToLevels={() => setPicker("levels")}
          onSelectPart={selectPart}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}
