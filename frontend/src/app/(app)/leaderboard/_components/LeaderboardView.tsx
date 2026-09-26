"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import {
  POLL_INTERVAL_MS,
  TEAM_COLORS,
  buildSeries,
  CHART_RANGES,
  rangeStart,
  type ChartRange,
  rankTeams,
  type Leaderboard,
} from "@/lib/leaderboard";
import { teamLabel, type Team } from "@/lib/scores";
import { formatTime } from "@/lib/schedule";
import PageBanner from "@/components/PageBanner";
import { ChevronRight } from "@/components/icons";
import ScoreChart from "./ScoreChart";

export default function LeaderboardView({ initial }: { initial: Leaderboard }) {
  const [board, setBoard] = useState<Leaderboard>(initial);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [stale, setStale] = useState(false);
  // The team whose points breakdown is open. Only one at a time.
  const [open, setOpen] = useState<Team | null>(null);

  // No auth header: the leaderboard is public, so this polls the same way
  // for a signed-out visitor as for a logged-in student.
  const poll = useCallback(async () => {
    try {
      const res = await api.get<Leaderboard>("/api/leaderboard");
      setBoard(res.data);
      setUpdatedAt(new Date());
      setStale(false);
    } catch {
      // Keep showing the last good standings — a dropped poll on a flaky
      // phone connection shouldn't blank out the page.
      setStale(true);
    }
  }, []);

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
  // 6H by default: wide enough to hold an evening of scoring, narrow enough
  // that a stray overnight award can't squash it. Recomputed whenever the
  // board polls, so the window keeps sliding forward on its own.
  const [range, setRange] = useState<ChartRange>("6h");
  const chart = useMemo(
    () => buildSeries(board, rangeStart(range)),
    [board, range],
  );
  const hasScores = board.points.length > 0;

  const status = stale
    ? "Reconnecting…"
    : updatedAt
      ? `Updated ${formatTime(updatedAt)}`
      : "Live";

  return (
    <>
      <PageBanner title="Leaderboard" subtitle={status} />

      <main className="min-h-screen bg-sched-bg px-4 pb-16 pt-6 lg:px-10 lg:pb-11 lg:pt-[26px]">
        <section className="mt-6 lg:mt-0">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-sched-text-muted">
            Standings
          </h2>
          <ul className="mt-3 space-y-1.5">
            {standings.map((row) => {
              const isOpen = open === row.team;
              const sources = board.breakdown?.[row.team] ?? [];
              return (
                <li
                  key={row.team}
                  className="sched-day-row rounded-sm"
                  style={
                    {
                      "--row-color": TEAM_COLORS[row.team],
                      borderLeftColor: TEAM_COLORS[row.team],
                    } as React.CSSProperties
                  }
                >
                  {/* Tapping a team opens its breakdown and closes any
                      other; tapping it again closes it. */}
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : row.team)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left"
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
                    <ChevronRight
                      width={16}
                      height={16}
                      strokeWidth={2}
                      className={`text-sched-text-muted transition-transform ${
                        isOpen ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-sched-hair px-4 py-3">
                      {sources.length === 0 ? (
                        <p className="font-mono text-xs text-sched-text-muted">
                          No points yet.
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {sources.map((s, i) => (
                            <li
                              key={`${s.label}-${i}`}
                              className="flex items-baseline gap-4 font-mono text-[13px]"
                            >
                              <span className="flex-1 text-sched-text-muted">
                                {s.label}
                              </span>
                              <span className="text-sched-cream">
                                {s.value}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-sched-text-muted">
              Score over time
            </h2>
            {/* Time range sits above the chart it filters. Totals are
                unaffected — only how much of the timeline is on screen. */}
            {hasScores && (
              <div className="flex gap-1.5">
                {CHART_RANGES.map((r) => {
                  const active = range === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRange(r.value)}
                      aria-pressed={active}
                      className={`border px-[10px] py-[5px] font-mono text-[10px] font-medium uppercase tracking-[0.1em] transition-colors ${
                        active
                          ? "border-sched-accent text-sched-accent"
                          : "border-sched-hair text-sched-text-muted hover:border-sched-accent-dim"
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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
