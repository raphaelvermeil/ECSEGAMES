import { TEAM_SIZE, type CompSlot, type CompTeam } from "@/lib/cs-comp";

export default function MyTeamPanel({
  team,
  rows,
  solvedCount,
  totalParts,
  levelPartShort,
  partTitle,
  confirming,
  onAskLeave,
  onCancelLeave,
  onLeave,
}: {
  team: CompTeam;
  rows: CompSlot[];
  solvedCount: number;
  totalParts: number;
  levelPartShort: string;
  partTitle: string;
  confirming: boolean;
  onAskLeave: () => void;
  onCancelLeave: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="bg-sched-bg px-5 pb-14 pt-8 lg:px-[60px] lg:pb-[60px] lg:pt-[34px]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div
          className="flex-1 bg-sched-bg-raised lg:min-w-[520px]"
          style={{ border: "1px solid var(--color-sched-hair)" }}
        >
          <div className="flex items-center gap-3.5 border-b border-sched-row-line px-[22px] py-5">
            <div
              className="h-[13px] w-[13px] flex-none"
              style={{ background: team.color }}
            />
            <span className="flex-1 font-display text-[27px] font-semibold tracking-[0.05em] text-sched-cream">
              {team.name}
            </span>
            <span
              className="font-mono text-[15px] font-medium"
              style={{ color: team.color }}
            >
              {rows.filter((r) => !r.open).length}/{TEAM_SIZE}
            </span>
          </div>

          <div className="flex flex-col">
            {rows.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 border-b border-sched-row-line px-[22px] py-[15px] last:border-b-0"
              >
                <div
                  className="flex h-11 w-11 flex-none items-center justify-center rounded-full font-mono text-xs font-medium"
                  style={{
                    border: `2px solid ${s.ring}`,
                    background: s.fill,
                    color: s.ink,
                  }}
                >
                  {s.initials}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span
                    className="truncate font-mono text-[15px]"
                    style={{ color: s.nameInk }}
                  >
                    {s.name}
                  </span>
                  <span className="truncate font-mono text-[11px] tracking-[0.06em] text-sched-text-muted">
                    {s.program}
                  </span>
                </div>
                <span
                  className="font-mono text-[10px] tracking-[0.14em]"
                  style={{ color: s.tagInk }}
                >
                  {s.tag}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:w-[352px] lg:flex-none">
          <div
            className="bg-sched-bg-raised px-[22px] py-5"
            style={{ border: "1px solid var(--color-sched-hair)" }}
          >
            <div className="font-mono text-[10px] tracking-[0.18em] text-sched-text-muted">
              PARTS SOLVED
            </div>
            <div className="mt-2.5 flex items-baseline gap-2.5">
              <span className="font-mono text-[34px] font-medium text-sched-cream">
                {solvedCount}
              </span>
              <span className="font-mono text-xs text-sched-text-muted">
                of {totalParts}
              </span>
            </div>
            <div className="mt-[18px] font-mono text-[10px] tracking-[0.18em] text-sched-text-muted">
              CURRENTLY ON
            </div>
            <div className="mt-2.5 flex items-baseline gap-2.5">
              <span className="font-mono text-[34px] font-medium text-sched-accent">
                {levelPartShort}
              </span>
              <span className="font-mono text-xs text-sched-text-muted">
                {partTitle}
              </span>
            </div>
          </div>

          <div
            className="bg-sched-bg-raised px-[22px] py-5"
            style={{ border: "1px solid rgba(255,123,84,.34)" }}
          >
            <div className="font-display text-[17px] font-semibold tracking-[0.04em] text-sched-cream">
              Leave this team?
            </div>
            <p className="mt-2.5 text-pretty font-mono text-xs leading-[1.6] text-sched-text-muted">
              Your slot opens up for someone else and you lose access to the
              battle editor until you join another squad.
            </p>
            {confirming ? (
              <div className="mt-[18px] flex gap-2.5">
                <button
                  type="button"
                  onClick={onLeave}
                  className="min-h-[46px] flex-1 bg-sched-coral font-mono text-xs font-medium tracking-[0.14em] text-[#1a0e08]"
                >
                  YES, LEAVE
                </button>
                <button
                  type="button"
                  onClick={onCancelLeave}
                  className="min-h-[46px] flex-1 border border-sched-hair font-mono text-xs font-medium tracking-[0.14em] text-sched-text-muted"
                >
                  CANCEL
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onAskLeave}
                className="mt-[18px] min-h-[46px] w-full border border-sched-coral font-mono text-xs font-medium tracking-[0.14em] text-sched-coral transition-colors hover:bg-sched-coral hover:text-[#1a0e08]"
              >
                LEAVE TEAM
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
