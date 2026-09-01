import type { TeamMember } from "@/lib/team";
import { crewFor, initials } from "@/lib/team";

// Phone and desktop need genuinely different arrangements — on a phone the
// avatar sits beside the name with the blurb underneath, on desktop it's a
// three-column band — so the two are laid out separately rather than bent into
// one flex tree. The shared pieces below keep the field markup in one place.
export default function TeamDetailPanel({ member }: { member: TeamMember }) {
  const crew = crewFor(member.crew);

  const avatar = (size: number, text: number, ring: number) => (
    <div
      className="flex flex-none items-center justify-center rounded-full font-mono font-semibold"
      style={{
        height: size,
        width: size,
        fontSize: text,
        border: `${ring}px solid ${crew.color}`,
        background: "#16241c",
        color: crew.color,
      }}
    >
      {initials(member.name)}
    </div>
  );

  const role = (
    <div
      className="font-mono text-[9px] font-medium tracking-[0.18em]"
      style={{ color: crew.color }}
    >
      {crew.role}
    </div>
  );

  const linkedIn = (
    <a
      href={member.linkedinUrl}
      target="_blank"
      rel="noreferrer"
      className="flex min-h-[44px] w-full items-center justify-center gap-[9px] font-mono text-[11px] font-medium tracking-[0.14em] text-white lg:min-h-[50px] lg:text-xs"
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
  );

  return (
    <div
      className="flex flex-none flex-col border-t border-sched-hair lg:min-h-[184px] lg:flex-row"
      style={{ background: "#0f1512" }}
    >
      {/* Phone: one tight column — identity row, clamped blurb, button. Kept
          short so the banner, scene and this panel add up to the viewport
          height exactly (see TeamView's h-dvh column). */}
      <div className="flex flex-col gap-3 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-3">
          {avatar(56, 17, 2)}
          <div className="min-w-0 flex-1">
            {role}
            <div className="mt-[3px] font-display text-[19px] font-semibold leading-tight tracking-[0.02em] text-sched-cream">
              {member.name}
            </div>
            <div className="font-mono text-[11px] text-sched-accent">
              {member.program}
            </div>
          </div>
        </div>
        <p className="line-clamp-2 text-pretty font-mono text-[12px] leading-[1.6] text-sched-text-muted">
          {member.blurb}
        </p>
        {linkedIn}
      </div>

      {/* Desktop: unchanged three-column band. */}
      <div className="hidden flex-none flex-col items-center justify-center gap-[9px] bg-sched-bg-raised lg:flex lg:w-[170px]">
        {avatar(104, 28, 3)}
        <div
          className="font-mono text-[9px] tracking-[0.1em]"
          style={{ color: "#5d7063" }}
        >
          HEADSHOT SLOT
        </div>
      </div>

      <div className="hidden flex-1 flex-col gap-[9px] text-left lg:flex lg:px-[26px] lg:py-[22px]">
        {role}
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

      <div className="hidden flex-none items-end lg:flex lg:w-[240px] lg:p-[22px]">
        {linkedIn}
      </div>
    </div>
  );
}
