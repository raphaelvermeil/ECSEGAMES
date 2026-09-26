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
  // Where each team's points came from: one line per event, plus all
  // Scunts points as a single line. Largest first.
  breakdown: Partial<Record<Team, PointSource[]>>;
}

export interface PointSource {
  label: string;
  value: number;
}

export const EMPTY_LEADERBOARD: Leaderboard = {
  totals: {},
  points: [],
  breakdown: {},
};

// How often the view re-polls for scores. The Games are scored by hand by
// execs, so awards land minutes apart at best — polling faster would just
// add load without ever showing anything new.
export const POLL_INTERVAL_MS = 15_000;

// Team line colours: the schedule's arcade accents re-stepped for chart
// use. The schedule's raw accents separate by only ΔE 8.6 under
// deuteranopia (violet vs cyan) — barely over the ΔE 8 floor — so these
// are tuned to ΔE 19.4 while keeping the same hues and staying above 3:1
// contrast on sched-bg. Verified with the dataviz palette validator.
// Validated against the dark chart surface (#0b1310) with the dataviz
// palette checker: every pair clears the normal-vision floor (worst 22.6)
// and colour-vision separation (worst 11.4 protan), and all four clear 3:1
// contrast. Red and pink are the risky pair — red sits at a true red and
// pink well into magenta precisely so they stay apart. Don't nudge these
// by eye; re-run the checker if they change.
export const TEAM_COLORS: Record<Team, string> = {
  electrical: "#2f9be0",
  computer: "#ffaae0",
  software: "#ffd75a",
  oldPatrol: "#ef4136",
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

// The windows the chart can be viewed through. A single early award would
// otherwise stretch the axis across the whole day and squash a busy evening
// into the last few pixels.
export type ChartRange = "1h" | "6h" | "today" | "all";

export const CHART_RANGES: { value: ChartRange; label: string }[] = [
  { value: "1h", label: "1H" },
  { value: "6h", label: "6H" },
  { value: "today", label: "Today" },
  { value: "all", label: "All" },
];

// Where a range starts, or null for "all" (which starts at the first
// award). `now` is injectable so this stays testable.
export function rangeStart(range: ChartRange, now = Date.now()): number | null {
  switch (range) {
    case "1h":
      return now - 3_600_000;
    case "6h":
      return now - 6 * 3_600_000;
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    default:
      return null;
  }
}

// Turns the flat award list into one cumulative step curve per team.
//
// Every team's curve spans the full time domain — it steps up at each of its
// own awards and holds flat to the end — so the lines stay comparable at any
// x rather than each starting and stopping at its own first and last award.
//
// `since` narrows the view to a window. Awards before it still count: each
// curve begins at the team's running total as of that moment rather than at
// zero, so zooming in changes what you can see, never what the totals say.
export function buildSeries(
  board: Leaderboard,
  since: number | null = null,
): ChartData {
  // Running sums depend on order, so sort here rather than trusting the
  // backend's ordering to hold forever.
  const ordered = [...board.points].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
  const times = ordered.map((p) => new Date(p.at).getTime());
  const firstAward = times.length ? Math.min(...times) : 0;
  const lastAward = times.length ? Math.max(...times) : 0;

  const tMin = since ?? firstAward;
  // A window runs to now, not to the last award — otherwise "last hour"
  // would silently end early whenever scoring had paused. Unwindowed keeps
  // ending at the last award.
  const rawMax = since !== null ? Math.max(Date.now(), lastAward) : lastAward;
  // A single award (or several at the same instant) would collapse the
  // domain to zero width and divide by zero when scaling x. Give it an
  // hour of span so the curve has somewhere to be drawn.
  const tMax = rawMax > tMin ? rawMax : tMin + 3_600_000;

  const series = TEAMS.map(({ value: team }) => {
    let running = 0;
    let atStart = 0;
    const inWindow: SeriesPoint[] = [];
    for (const p of ordered) {
      if (p.team !== team) continue;
      const t = new Date(p.at).getTime();
      running += p.value;
      if (t < tMin) {
        // Before the window: counts towards the total, but is drawn as the
        // height the curve already starts at.
        atStart = running;
        continue;
      }
      inWindow.push({ t, total: running });
    }
    const points: SeriesPoint[] = [
      { t: tMin, total: atStart },
      ...inWindow,
      { t: tMax, total: running },
    ];
    return { team, points, total: running };
  });

  const all = series.flatMap((s) => s.points.map((p) => p.total));
  const maxTotal = Math.max(0, ...all);
  const minTotal = Math.min(0, ...all);
  return { series, tMin, tMax, minTotal, maxTotal };
}
