import {
  TEAM_SIZE,
  TEAMS,
  roster,
  slots,
  type CompMember,
  type CompTeam,
} from "@/lib/cs-comp";

export default function TeamsPanel({
  teamId,
  meMember,
  part,
  onJoin,
}: {
  teamId: string | null;
  meMember: CompMember;
  part: number;
  onJoin: (team: CompTeam) => void;
}) {
  const openCount = TEAMS.filter(
    (t) => roster(t, meMember, teamId).length < TEAM_SIZE,
  ).length;

  return (
    <div className="bg-sched-bg px-5 pb-14 pt-8 lg:px-[60px] lg:pb-[60px] lg:pt-[34px]">
      <div className="flex flex-wrap items-baseline gap-3.5">
        <h2 className="font-display text-2xl font-semibold tracking-[0.03em] text-sched-cream lg:text-[26px]">
          Pick your squad
        </h2>
        <span className="font-mono text-xs text-sched-text-muted">
          {openCount} of {TEAMS.length} teams still have room · {TEAM_SIZE}{" "}
          coders per team
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {TEAMS.map((team) => {
          const joined = teamId === team.id;
          const full = roster(team, meMember, teamId).length >= TEAM_SIZE;
          const rows = slots(team, meMember, teamId, part);
          const label = joined
            ? "✓ YOUR TEAM — OPEN BATTLE"
            : full
              ? "TEAM FULL"
              : "JOIN TEAM";

          return (
            <div
              key={team.id}
              className="flex flex-col bg-sched-bg-raised"
              style={{
                border: `1px solid ${joined ? team.color : "var(--color-sched-hair)"}`,
              }}
            >
              <div className="flex items-center gap-[11px] border-b border-sched-row-line px-[18px] pb-3.5 pt-4">
                <div
                  className="h-[11px] w-[11px] flex-none"
                  style={{ background: team.color }}
                />
                <span className="flex-1 font-display text-[19px] font-semibold tracking-[0.05em] text-sched-cream">
                  {team.name}
                </span>
                <span
                  className="font-mono text-[13px] font-medium"
                  style={{ color: team.color }}
                >
                  {roster(team, meMember, teamId).length}/{TEAM_SIZE}
                </span>
              </div>

              <div className="flex flex-col gap-2.5 px-[18px] py-4">
                {rows.map((s, i) => (
                  <div key={i} className="flex min-h-9 items-center gap-2.5">
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
                  disabled={full && !joined}
                  onClick={() => onJoin(team)}
                  className="w-full min-h-[46px] font-mono text-xs font-medium tracking-[0.14em] disabled:cursor-not-allowed"
                  style={{
                    background: joined ? team.color : "none",
                    border: `1px solid ${
                      joined
                        ? team.color
                        : full
                          ? "rgba(63,143,87,.2)"
                          : "var(--color-sched-accent-dim)"
                    }`,
                    color: joined ? "#0b1310" : full ? "#4d6455" : "#e9f5cd",
                    cursor: full && !joined ? "not-allowed" : "pointer",
                  }}
                >
                  {label}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
