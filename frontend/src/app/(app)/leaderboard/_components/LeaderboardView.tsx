"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import api from "@/lib/api";
import {
  POLL_INTERVAL_MS,
  TEAM_COLORS,
  buildSeries,
  rankTeams,
  type Leaderboard,
} from "@/lib/leaderboard";
import { teamLabel } from "@/lib/scores";
import { formatTime } from "@/lib/schedule";
import MobilePageBanner from "@/components/MobilePageBanner";
import ScoreChart from "./ScoreChart";

export default function LeaderboardView({ initial }: { initial: Leaderboard }) {
  const { getToken } = useAuth();
  const [board, setBoard] = useState<Leaderboard>(initial);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [stale, setStale] = useState(false);

  const poll = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await api.get<Leaderboard>("/api/leaderboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBoard(res.data);
      setUpdatedAt(new Date());
      setStale(false);
    } catch {
      // Keep showing the last good standings — a dropped poll on a flaky
      // phone connection shouldn't blank out the page.
      setStale(true);
    }
  }, [getToken]);

  useEffect(() => {
    // Polling while the tab is hidden would hammer the backend all day for
    // a page nobody is looking at; resume with an immediate refresh so the
    // numbers are current the moment someone comes back.
    let timer: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (timer) return;
      timer = setInterval(poll, POLL_INTERVAL_MS);
    }
    function stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    }
    function onVisibility() {
      if (document.visibilityState === "visible") {
        poll();
        start();
      } else {
        stop();
      }
    }

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [poll]);

  const standings = useMemo(() => rankTeams(board), [board]);
  const chart = useMemo(() => buildSeries(board), [board]);
  const hasScores = board.points.length > 0;

  const status = stale
    ? "Reconnecting…"
    : updatedAt
      ? `Updated ${formatTime(updatedAt)}`
      : "Live";

  return (
    <>
      <MobilePageBanner title="Leaderboard" subtitle={status} />

      <main className="min-h-screen bg-sched-bg px-4 pb-16 pt-6 lg:px-10 lg:pb-11 lg:pt-9">
        <div className="hidden items-baseline justify-between lg:flex">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-[0.01em] text-sched-cream">
              Leaderboard
            </h1>
            <p className="mt-1.5 font-mono text-xs text-sched-accent">
              {status}
            </p>
          </div>
        </div>

        <section className="mt-6 lg:mt-8">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-sched-text-muted">
            Standings
          </h2>
          <ul className="mt-3 space-y-1.5">
            {standings.map((row) => (
              <li
                key={row.team}
                className="sched-day-row flex items-center gap-4 rounded-sm px-4 py-3"
                style={
                  {
                    "--row-color": TEAM_COLORS[row.team],
                    borderLeftColor: TEAM_COLORS[row.team],
                  } as React.CSSProperties
                }
              >
                <span className="w-6 font-display text-lg text-sched-text-muted">
                  {row.rank}
                </span>
                <span className="flex-1 font-display text-lg tracking-wide text-sched-cream">
                  {teamLabel(row.team)}
                </span>
                <span className="font-mono text-lg text-sched-cream">
                  {row.total}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-sched-text-muted">
            Score over time
          </h2>
          <div className="mt-3 overflow-x-auto rounded-sm border border-sched-hair bg-sched-bg-raised p-3 lg:p-4">
            {hasScores ? (
              <ScoreChart data={chart} />
            ) : (
              <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center">
                <p className="font-display text-xl text-sched-text">
                  No points awarded yet
                </p>
                <p className="max-w-xs font-mono text-xs text-sched-text-muted">
                  Team scores appear here as execs award points during the
                  Games.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
