import type { TeamMember } from "@/lib/team";
import { crewFor, initials } from "@/lib/team";

export default function TeamDetailPanel({ member }: { member: TeamMember }) {
  const crew = crewFor(member.crew);

  return (
    <div
      className="flex flex-col border-t border-sched-hair lg:flex-row"
      style={{ background: "#0f1512", minHeight: 184 }}
    >
      <div className="flex flex-none flex-col items-center justify-center gap-[9px] bg-sched-bg-raised px-6 py-6 lg:w-[170px] lg:py-0">
        <div
          className="flex h-[104px] w-[104px] items-center justify-center rounded-full font-mono text-[28px] font-semibold"
          style={{
            border: `3px solid ${crew.color}`,
            background: "#16241c",
            color: crew.color,
          }}
        >
          {initials(member.name)}
        </div>
        <div
          className="font-mono text-[9px] tracking-[0.1em]"
          style={{ color: "#5d7063" }}
        >
          HEADSHOT SLOT
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-[9px] px-6 py-5 text-center lg:px-[26px] lg:py-[22px] lg:text-left">
        <div
          className="font-mono text-[9px] font-medium tracking-[0.18em]"
          style={{ color: crew.color }}
        >
          {crew.role}
        </div>
        <div className="font-display text-[27px] font-semibold leading-none tracking-[0.02em] text-sched-cream">
          {member.name}
        </div>
        <div className="font-mono text-[13px] text-sched-accent">
          {member.program}
        </div>
        <p className="max-w-[720px] text-pretty font-mono text-[13px] leading-[1.7] text-sched-text-muted">
          {member.blurb}
        </p>
      </div>

      <div className="flex flex-none items-end px-6 pb-6 lg:w-[240px] lg:p-[22px]">
        <a
          href={member.linkedinUrl}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-[50px] w-full items-center justify-center gap-[9px] font-mono text-xs font-medium tracking-[0.14em] text-white"
          style={{ background: "#0a66c2" }}
        >
          <span
            className="flex h-5 w-5 items-center justify-center bg-white font-mono text-[10px] font-semibold"
            style={{ color: "#0a66c2" }}
          >
            in
          </span>
          VIEW LINKEDIN
        </a>
      </div>
    </div>
  );
}
