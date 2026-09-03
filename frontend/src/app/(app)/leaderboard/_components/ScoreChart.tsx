"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  TEAM_COLORS,
  TEAM_DASH,
  type ChartData,
  type TeamSeries,
} from "@/lib/leaderboard";
import { teamLabel, TEAMS, type Team } from "@/lib/scores";
import { formatDayLabel, formatTime } from "@/lib/schedule";

const PAD = { top: 18, right: 76, bottom: 34, left: 46 };
const HEIGHT = 340;
const MIN_LABEL_GAP = 15;

// Axis ticks land on 1/2/5×10ⁿ so the gridline values read as round
// numbers rather than whatever maxTotal happens to be.
function niceStep(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  const c = raw / pow;
  const m = c <= 1 ? 1 : c <= 2 ? 2 : c <= 5 ? 5 : 10;
  return m * pow;
}

function buildTicks(min: number, max: number): number[] {
  const step = niceStep((max - min) / 4 || 1);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v));
  return out;
}

// The cumulative total holds flat until an award lands, then jumps — so the
// curve is a step, not a diagonal. Drawing it as a straight line between
// awards would imply points trickled in continuously, which they didn't.
function stepPath(
  s: TeamSeries,
  x: (t: number) => number,
  y: (v: number) => number,
): string {
  if (!s.points.length) return "";
  let d = `M ${x(s.points[0].t)} ${y(s.points[0].total)}`;
  for (let i = 1; i < s.points.length; i++) {
    d += ` L ${x(s.points[i].t)} ${y(s.points[i - 1].total)}`;
    d += ` L ${x(s.points[i].t)} ${y(s.points[i].total)}`;
  }
  return d;
}

// Nudges end-labels apart when two teams finish on close totals, so they
// never overlap into an unreadable pile.
function spreadLabels(rows: { team: Team; y: number }[]): Map<Team, number> {
  const sorted = [...rows].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].y - sorted[i - 1].y;
    if (gap < MIN_LABEL_GAP) sorted[i].y = sorted[i - 1].y + MIN_LABEL_GAP;
  }
  return new Map(sorted.map((r) => [r.team, r.y]));
}

export default function ScoreChart({ data }: { data: ChartData }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(880);
  const [hoverT, setHoverT] = useState<number | null>(null);

  // Render at real pixel width rather than scaling one fixed viewBox: a
  // scaled viewBox would shrink the axis type to a few pixels on a phone.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(Math.max(280, entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ticks = useMemo(
    () => buildTicks(data.minTotal, data.maxTotal),
    [data.minTotal, data.maxTotal],
  );

  const yLo = ticks[0];
  const yHi = ticks[ticks.length - 1];
  const plotW = Math.max(1, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const x = (t: number) =>
    PAD.left + ((t - data.tMin) / (data.tMax - data.tMin)) * plotW;
  const y = (v: number) => PAD.top + (1 - (v - yLo) / (yHi - yLo || 1)) * plotH;

  const endLabels = spreadLabels(
    data.series.map((s) => ({ team: s.team, y: y(s.total) })),
  );

  // Totals for each team at the hovered instant — the value in force is the
  // last award at or before that time, matching how the step curve reads.
  const hoverRows = useMemo(() => {
    if (hoverT === null) return null;
    return data.series.map((s) => {
      let total = 0;
      for (const p of s.points) {
        if (p.t <= hoverT) total = p.total;
        else break;
      }
      return { team: s.team, total };
    });
  }, [hoverT, data.series]);

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const ratio = (px - PAD.left) / plotW;
    if (ratio < 0 || ratio > 1) return setHoverT(null);
    setHoverT(data.tMin + ratio * (data.tMax - data.tMin));
  }

  const hoverX = hoverT === null ? 0 : x(hoverT);
  const tooltipLeft = hoverX > width - 150 ? hoverX - 138 : hoverX + 12;

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Score over time. ${data.series
          .map((s) => `${teamLabel(s.team)} ${s.total}`)
          .join(", ")}.`}
        onMouseMove={onMove}
        onMouseLeave={() => setHoverT(null)}
        className="touch-none select-none"
      >
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke={
                v === 0
                  ? "var(--color-sched-hair)"
                  : "var(--color-sched-row-line)"
              }
              strokeWidth={1}
            />
            <text
              x={PAD.left - 10}
              y={y(v) + 4}
              textAnchor="end"
              className="fill-sched-text-muted font-mono text-[11px]"
            >
              {v}
            </text>
          </g>
        ))}

        <text
          x={PAD.left}
          y={HEIGHT - 12}
          className="fill-sched-text-muted font-mono text-[11px]"
        >
          {formatDayLabel(new Date(data.tMin))}{" "}
          {formatTime(new Date(data.tMin))}
        </text>
        <text
          x={width - PAD.right}
          y={HEIGHT - 12}
          textAnchor="end"
          className="fill-sched-text-muted font-mono text-[11px]"
        >
          {formatDayLabel(new Date(data.tMax))}{" "}
          {formatTime(new Date(data.tMax))}
        </text>

        {hoverT !== null && (
          <line
            x1={hoverX}
            x2={hoverX}
            y1={PAD.top}
            y2={HEIGHT - PAD.bottom}
            stroke="var(--color-sched-accent-dim)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        {data.series.map((s) => (
          <path
            key={s.team}
            d={stepPath(s, x, y)}
            fill="none"
            stroke={TEAM_COLORS[s.team]}
            strokeDasharray={TEAM_DASH[s.team] || undefined}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* Interior awards only — the synthetic domain endpoints aren't
            real events and shouldn't get a marker. */}
        {data.series.flatMap((s) =>
          s.points
            .slice(1, -1)
            .map((p, i) => (
              <circle
                key={`${s.team}-${i}`}
                cx={x(p.t)}
                cy={y(p.total)}
                r={4}
                fill={TEAM_COLORS[s.team]}
                stroke="var(--color-sched-bg)"
                strokeWidth={2}
              />
            )),
        )}

        {data.series.map((s) => (
          <g key={`lbl-${s.team}`}>
            <rect
              x={width - PAD.right + 8}
              y={(endLabels.get(s.team) ?? 0) - 8}
              width={7}
              height={7}
              rx={1}
              fill={TEAM_COLORS[s.team]}
            />
            <text
              x={width - PAD.right + 19}
              y={(endLabels.get(s.team) ?? 0) - 1}
              className="fill-sched-text font-mono text-[11px]"
            >
              {s.total}
            </text>
          </g>
        ))}
      </svg>

      {hoverRows && (
        <div
          className="pointer-events-none absolute top-4 z-10 rounded border border-sched-hair bg-sched-bg-raised px-3 py-2 shadow-lg"
          style={{ left: tooltipLeft }}
        >
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-sched-text-muted">
            {formatDayLabel(new Date(hoverT!))} {formatTime(new Date(hoverT!))}
          </p>
          {[...hoverRows]
            .sort((a, b) => b.total - a.total)
            .map((r) => (
              <div
                key={r.team}
                className="flex items-center justify-between gap-4 py-px"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-[1px]"
                    style={{ background: TEAM_COLORS[r.team] }}
                  />
                  <span className="font-mono text-[11px] text-sched-text">
                    {teamLabel(r.team)}
                  </span>
                </span>
                <span className="font-mono text-[11px] text-sched-cream">
                  {r.total}
                </span>
              </div>
            ))}
        </div>
      )}

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {TEAMS.map(({ value }) => (
          <li key={value} className="flex items-center gap-2">
            <svg width={22} height={8} aria-hidden="true">
              <line
                x1={0}
                x2={22}
                y1={4}
                y2={4}
                stroke={TEAM_COLORS[value]}
                strokeDasharray={TEAM_DASH[value] || undefined}
                strokeWidth={2}
              />
            </svg>
            <span className="font-mono text-[11px] text-sched-text">
              {teamLabel(value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
