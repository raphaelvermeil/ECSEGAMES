"use client";

import { useState } from "react";
import { TEAM_SIZE, slots } from "@/lib/cs-comp";
import type { Claim, CompTeam } from "@/lib/cscomp-api";

export default function TeamsPanel({
  teams,
  colors,
  myTeamId,
  meClerkId,
  claims,
  challengeLabel,
  busy,
  onJoin,
  onCreate,
}: {
  teams: CompTeam[];
  colors: Record<string, string>;
  myTeamId: string | null;
  meClerkId: string;
  claims: Claim[];
  challengeLabel: (challengeId: string) => string;
  busy: boolean;
  onJoin: (team: CompTeam) => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const openCount = teams.filter((t) => t.memberCount < TEAM_SIZE).length;

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    onCreate(trimmed);
    setName("");
  }

  return (
    <div className="bg-sched-bg px-5 pb-14 pt-8 lg:px-[60px] lg:pb-[60px] lg:pt-[34px]">
      <div className="flex flex-wrap items-baseline gap-3.5">
        <h2 className="font-display text-2xl font-semibold tracking-[0.03em] text-sched-cream lg:text-[26px]">
          Pick your squad
        </h2>
        <span className="font-mono text-xs text-sched-text-muted">
          {openCount} of {teams.length} {teams.length === 1 ? "team" : "teams"}{" "}
          still {openCount === 1 ? "has" : "have"} room · {TEAM_SIZE} coders per
          team
        </span>
      </div>

      {/* Students run their own squads — there is no exec step to create
          one, so the form sits right next to the list it adds to. */}
      {myTeamId === null && (
        <form onSubmit={submitNew} className="mt-5 flex flex-wrap gap-2.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Start a new team…"
            aria-label="New team name"
            className="min-h-[46px] min-w-0 flex-1 border border-sched-hair bg-sched-bg-raised px-4 font-mono text-xs text-sched-cream outline-none placeholder:text-[#4d6455] focus:border-sched-accent-dim lg:max-w-[340px]"
          />
          <button
            type="submit"
            disabled={busy || name.trim() === ""}
            className="min-h-[46px] border border-sched-accent-dim px-[22px] font-mono text-xs font-medium tracking-[0.14em] text-sched-accent transition-colors hover:bg-[#16241c] hover:text-sched-cream disabled:cursor-not-allowed disabled:opacity-40"
          >
            CREATE TEAM
          </button>
        </form>
      )}

      {teams.length === 0 ? (
        <p className="mt-6 border border-sched-hair bg-sched-bg-raised px-5 py-10 text-center font-mono text-sm text-sched-text-muted">
          No teams yet. Be the first to start one.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {teams.map((team) => {
            const joined = myTeamId === team.id;
            const full = team.memberCount >= TEAM_SIZE;
            const color = colors[team.id] ?? "#6ee787";
            // Claims are only loaded for the team you are on, so every
            // other roster shows its members without a part label.
            const rows = slots(
              team.members,
              meClerkId,
              color,
              joined ? claims : [],
              challengeLabel,
            );
            const label = joined
              ? "✓ YOUR TEAM — OPEN BATTLE"
              : full
                ? "TEAM FULL"
                : myTeamId !== null
                  ? "ALREADY ON A TEAM"
                  : "JOIN TEAM";
            const disabled = busy || (!joined && (full || myTeamId !== null));

            return (
              <div
                key={team.id}
                className="flex flex-col bg-sched-bg-raised"
                style={{
                  border: `1px solid ${joined ? color : "var(--color-sched-hair)"}`,
                }}
              >
                <div className="flex items-center gap-[11px] border-b border-sched-row-line px-[18px] pb-3.5 pt-4">
                  <div
                    className="h-[11px] w-[11px] flex-none"
                    style={{ background: color }}
                  />
                  <span className="flex-1 truncate font-display text-[19px] font-semibold tracking-[0.05em] text-sched-cream">
                    {team.name}
                  </span>
                  <span
                    className="flex-none font-mono text-[13px] font-medium"
                    style={{ color }}
                  >
                    {team.memberCount}/{TEAM_SIZE}
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 px-[18px] py-4">
                  {rows.map((s) => (
                    <div
                      key={s.key}
                      className="flex min-h-9 items-center gap-2.5"
                    >
                      <div
                        className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full font-mono text-[10px] font-medium"
                        style={{
                          border: `2px solid ${s.ring}`,
                          background: s.fill,
                          color: s.ink,
                        }}
                      >
                        {s.initials}
                      </div>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span
                          className="truncate font-mono text-[13px]"
                          style={{ color: s.nameInk }}
                        >
                          {s.name}
                        </span>
                        <span className="truncate font-mono text-[10px] tracking-[0.06em] text-sched-text-muted">
                          {s.program}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-auto px-[18px] pb-[18px]">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onJoin(team)}
                    className="min-h-[46px] w-full font-mono text-xs font-medium tracking-[0.14em] disabled:cursor-not-allowed"
                    style={{
                      background: joined ? color : "none",
                      border: `1px solid ${
                        joined
                          ? color
                          : full
                            ? "rgba(63,143,87,.2)"
                            : "var(--color-sched-accent-dim)"
                      }`,
                      color: joined ? "#0b1310" : full ? "#4d6455" : "#e9f5cd",
                    }}
                  >
                    {label}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
