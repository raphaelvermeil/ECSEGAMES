import Link from "next/link";
import { LEVEL_META, levelMeta, partKey } from "@/lib/cs-comp";
import type { Challenge, Leaderboard } from "@/lib/cscomp-api";

// The comp's own board. It is deliberately not the Games leaderboard: this
// ranks the comp's sub-teams on the 30 challenges and resets with the comp,
// while /leaderboard totals score entries across every event. The callout
// says so on the page, because the two boards sitting one nav link apart is
// exactly the confusion worth heading off.

// A team's per-part pips, in level order, so the row shows *where* a team
// scored and not just how much.
function pips(solvedParts: string[], challenges: Challenge[]) {
  const done = new Set(solvedParts);
  return challenges.map((c) => ({
    key: c.id,
    fill: done.has(partKey(c.level, c.part))
      ? levelMeta(c.level).color
      : "rgba(63,143,87,.18)",
  }));
}

export default function StandingsPanel({
  board,
  colors,
  myTeamId,
  challenges,
}: {
  board: Leaderboard | null;
  colors: Record<string, string>;
  myTeamId: string | null;
  challenges: Challenge[];
}) {
  // Challenges arrive in whatever order the store returned; the pips only
  // read as "parts by level" if they are laid out that way.
  const ordered = [...challenges].sort(
    (a, b) => a.level - b.level || a.part - b.part,
  );

  if (!board) {
    return (
      <div className="bg-sched-bg px-5 py-20 text-center lg:px-[60px]">
        <p className="font-mono text-sm text-sched-text-muted">
          Loading the standings…
        </p>
      </div>
    );
  }

  const top = Math.max(1, board.standings[0]?.points ?? 1);

  return (
    <div className="bg-sched-bg px-5 pb-14 pt-8 lg:px-[60px] lg:pb-[60px] lg:pt-[34px]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex-1">
          <div className="flex items-center gap-[11px]">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 animate-pulse"
              style={{ background: "#6ee787" }}
            />
            <span className="font-mono text-[10px] font-medium tracking-[0.2em] text-[#6ee787]">
              LIVE · UPDATING EVERY SUBMISSION
            </span>
          </div>
          <h2 className="mt-2.5 font-display text-2xl font-semibold tracking-[0.03em] text-sched-cream lg:text-[30px]">
            CS comp · live standings
          </h2>
          <p className="mt-2 max-w-[640px] font-mono text-xs leading-[1.7] text-sched-text-muted">
            Every team&rsquo;s solved parts land here the moment they submit. A
            part counts once it matches the target closely enough for the server
            to call it solved.
          </p>
        </div>

        <div
          className="w-full flex-none px-[18px] py-4 lg:w-[300px]"
          style={{ background: "#101a15", borderLeft: "3px solid #ff7b54" }}
        >
          <div className="font-mono text-[9px] font-medium tracking-[0.18em] text-[#ff7b54]">
            NOT THE GLOBAL LEADERBOARD
          </div>
          <p className="mt-2 font-mono text-[11px] leading-[1.65] text-sched-text-muted">
            This board is CS comp only and resets every comp. Games-wide points
            across all events live on the site leaderboard.
          </p>
          <Link
            href="/leaderboard"
            className="mt-2.5 inline-block font-mono text-[10px] font-medium tracking-[0.14em] text-[#ff7b54] hover:underline"
          >
            OPEN GLOBAL LEADERBOARD →
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3.5 pb-2.5 pt-4">
        <span className="font-mono text-[10px] tracking-[0.16em] text-sched-text-muted">
          SKIPPED PARTS SIMPLY SCORE NOTHING
        </span>
        <div className="h-px flex-1 bg-sched-hair" />
        <span className="font-mono text-[10px] tracking-[0.16em] text-sched-text-muted">
          POINTS = LEVEL × 100 PER SOLVED PART
        </span>
      </div>

      {board.standings.length === 0 ? (
        <p className="border border-sched-hair bg-sched-bg-raised px-5 py-10 text-center font-mono text-sm text-sched-text-muted">
          No teams yet. Once a squad forms and solves a part, it shows up here.
        </p>
      ) : (
        <>
          {/* Column headings track the desktop row layout, so they stay with
              it below lg where the row collapses to two lines. */}
          <div className="hidden items-center gap-3.5 px-4 pb-2 lg:flex">
            <span className="w-[34px] flex-none font-mono text-[9px] tracking-[0.16em] text-[#5f7566]">
              #
            </span>
            <span className="flex-1 font-mono text-[9px] tracking-[0.16em] text-[#5f7566]">
              TEAM
            </span>
            <span className="w-[300px] flex-none font-mono text-[9px] tracking-[0.16em] text-[#5f7566]">
              PARTS BY LEVEL
            </span>
            <span className="w-[74px] flex-none text-right font-mono text-[9px] tracking-[0.16em] text-[#5f7566]">
              SOLVED
            </span>
            <span className="w-[92px] flex-none text-right font-mono text-[9px] tracking-[0.16em] text-[#5f7566]">
              POINTS
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {board.standings.map((row, i) => {
              const mine = row.teamId === myTeamId;
              const leader = i === 0;
              return (
                <div
                  key={row.teamId}
                  className="relative flex flex-wrap items-center gap-3.5 overflow-hidden px-4 py-[15px]"
                  style={{
                    background: mine
                      ? "#16241c"
                      : "var(--color-sched-bg-raised)",
                    border: `1px solid ${mine ? "#6ee787" : "var(--color-sched-hair)"}`,
                  }}
                >
                  <div
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 top-0"
                    style={{
                      width: `${Math.round((row.points / top) * 100)}%`,
                      background: mine
                        ? "rgba(110,231,135,.13)"
                        : "rgba(110,231,135,.055)",
                    }}
                  />
                  <span
                    className="relative w-[34px] flex-none font-mono text-[17px] font-medium"
                    style={{
                      color: leader ? "#ffd166" : mine ? "#6ee787" : "#7f9482",
                    }}
                  >
                    {i + 1}
                  </span>

                  <span className="relative flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 flex-none"
                        style={{ background: colors[row.teamId] ?? "#6ee787" }}
                      />
                      <span className="truncate font-display text-[19px] font-semibold tracking-[0.05em] text-sched-cream">
                        {row.name}
                      </span>
                      {mine && (
                        <span className="flex-none font-mono text-[9px] tracking-[0.14em] text-[#6ee787]">
                          YOUR TEAM
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-[10px] text-sched-text-muted">
                      {row.memberCount} of 5 coders ·{" "}
                      {row.solved > 0
                        ? `last solve L${row.lastLevel}`
                        : "no solves yet"}
                    </span>
                  </span>

                  <span
                    className="relative hidden w-[300px] flex-none gap-[5px] lg:flex"
                    aria-label={`${row.solved} of ${board.totalParts} parts solved`}
                  >
                    {pips(row.solvedParts, ordered).map((p) => (
                      <span
                        key={p.key}
                        className="h-5 w-2"
                        style={{ background: p.fill }}
                      />
                    ))}
                  </span>

                  <span className="relative w-[74px] flex-none text-right font-mono text-[15px] font-medium text-sched-text">
                    {row.solved}/{board.totalParts}
                  </span>
                  <span
                    className="relative w-[92px] flex-none text-right font-mono text-[21px] font-medium"
                    style={{ color: leader ? "#ffd166" : "#e9f5cd" }}
                  >
                    {row.points.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* The pips are only meaningful with a key to the level colours. */}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            {LEVEL_META.map((l) => (
              <span key={l.n} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2"
                  style={{ background: l.color }}
                  aria-hidden="true"
                />
                <span className="font-mono text-[10px] tracking-[0.1em] text-sched-text-muted">
                  L{l.n} {l.name} · {l.n * 100} pts
                </span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
