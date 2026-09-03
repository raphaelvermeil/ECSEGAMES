import { TEAMS, type Team } from "@/lib/scores";

// One team's award at a point in time, stripped of event identity by the
// backend (see scores.Leaderboard). Points arrive oldest-first.
export interface LeaderboardPoint {
  team: Team;
  value: number;
  at: string;
}

export interface Leaderboard {
  // Only teams with at least one active award appear — read through
  // teamTotal() so an ungraded team reads as 0 rather than undefined.
  totals: Partial<Record<Team, number>>;
  points: LeaderboardPoint[];
}

export const EMPTY_LEADERBOARD: Leaderboard = { totals: {}, points: [] };

// How often the view re-polls for scores. The Games are scored by hand by
// execs, so awards land minutes apart at best — polling faster would just
// add load without ever showing anything new.
export const POLL_INTERVAL_MS = 15_000;

// Team line colours: the schedule's arcade accents re-stepped for chart
// use. The schedule's raw accents separate by only ΔE 8.6 under
// deuteranopia (violet vs cyan) — barely over the ΔE 8 floor — so these
// are tuned to ΔE 19.4 while keeping the same hues and staying above 3:1
// contrast on sched-bg. Verified with the dataviz palette validator.
export const TEAM_COLORS: Record<Team, string> = {
  electrical: "#fe5920",
  computer: "#ffd75a",
  software: "#74dcff",
  oldPatrol: "#c066ff",
};

// Secondary encoding so the lines stay distinguishable without colour at
// all — for print, forced-colours mode, and anyone the palette still fails.
export const TEAM_DASH: Record<Team, string> = {
  electrical: "",
  computer: "8 4",
  software: "2 4",
  oldPatrol: "12 4 2 4",
};

export function teamTotal(board: Leaderboard, team: Team): number {
  return board.totals[team] ?? 0;
}

export interface Standing {
  team: Team;
  total: number;
  // Competition ranking: tied teams share a rank and the next rank skips
  // (1, 2, 2, 4), so a tie never renders as an arbitrary winner.
  rank: number;
}

export function rankTeams(board: Leaderboard): Standing[] {
  const rows = TEAMS.map(({ value }) => ({
    team: value,
    total: teamTotal(board, value),
    rank: 1,
  }));
  rows.sort((a, b) => b.total - a.total);
  rows.forEach((row, i) => {
    row.rank =
      i > 0 && row.total === rows[i - 1].total ? rows[i - 1].rank : i + 1;
  });
  return rows;
}

export interface SeriesPoint {
  t: number;
  total: number;
}

export interface TeamSeries {
  team: Team;
  points: SeriesPoint[];
  total: number;
}

export interface ChartData {
  series: TeamSeries[];
  tMin: number;
  tMax: number;
  // Range across every point on every curve, not just final totals: awards
  // may be negative (validate() only checks the team), so a curve can peak
  // and then dip, and the y-axis has to cover the whole excursion.
  minTotal: number;
  maxTotal: number;
}

// Turns the flat award list into one cumulative step curve per team.
//
// Every team's curve spans the full time domain — it starts at 0, steps up
// at each of its own awards, and holds flat to the end — so the lines stay
// comparable at any x rather than each starting and stopping at its own
// first and last award.
export function buildSeries(board: Leaderboard): ChartData {
  const times = board.points.map((p) => new Date(p.at).getTime());
  const tMin = times.length ? Math.min(...times) : 0;
  // A single award (or several at the same instant) would collapse the
  // domain to zero width and divide by zero when scaling x. Give it an
  // hour of span so the curve has somewhere to be drawn.
  const rawMax = times.length ? Math.max(...times) : 0;
  const tMax = rawMax > tMin ? rawMax : tMin + 3_600_000;

  const series = TEAMS.map(({ value: team }) => {
    const points: SeriesPoint[] = [{ t: tMin, total: 0 }];
    let running = 0;
    for (const p of board.points) {
      if (p.team !== team) continue;
      running += p.value;
      points.push({ t: new Date(p.at).getTime(), total: running });
    }
    points.push({ t: tMax, total: running });
    return { team, points, total: running };
  });

  const all = series.flatMap((s) => s.points.map((p) => p.total));
  const maxTotal = Math.max(0, ...all);
  const minTotal = Math.min(0, ...all);
  return { series, tMin, tMax, minTotal, maxTotal };
}
