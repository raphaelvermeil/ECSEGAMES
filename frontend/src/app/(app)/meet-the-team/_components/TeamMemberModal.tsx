"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X } from "@/components/icons";
import type { TeamMember } from "@/lib/team";
import { crewFor, initials } from "@/lib/team";

// Pops up over the scene on avatar click, replacing the old always-visible
// footer — nothing shows until a coord is clicked. Renders null while
// `member` is null rather than the caller conditionally mounting this, so the
// Escape-key listener below only exists while something is actually open.
export default function TeamMemberModal({
  member,
  onClose,
}: {
  member: TeamMember | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!member) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [member, onClose]);

  if (!member) return null;

  const crew = crewFor(member.crew);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto p-0 backdrop-blur-[4px] lg:items-center lg:p-5"
      style={{ background: "rgba(4,9,7,.72)" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={member.name}
        onClick={(e) => e.stopPropagation()}
        className="animate-sched-sheet w-full max-w-[520px] border-t border-sched-accent-dim bg-[#0f1512] font-mono lg:animate-sched-pop lg:border"
      >
        <div className="relative flex items-center gap-4 border-b border-sched-hair px-6 py-6">
          <div
            className="relative flex h-[90px] w-[90px] flex-none items-center justify-center overflow-hidden rounded-full font-mono text-[26px] font-semibold"
            style={{
              border: `3px solid ${crew.color}`,
              background: "#16241c",
              color: crew.color,
            }}
          >
            {member.photoPath ? (
              <Image
                src={member.photoPath}
                alt=""
                fill
                sizes="90px"
                style={{ objectFit: "cover" }}
              />
            ) : (
              initials(member.name)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-[10px] font-medium tracking-[0.16em]"
              style={{ color: crew.color }}
            >
              {crew.role}
            </div>
            <div className="mt-1 truncate font-display text-[27px] font-semibold leading-none tracking-[0.02em] text-sched-cream">
              {member.name}
            </div>
            <div className="mt-[6px] text-[13px] text-sched-accent">
              {member.program}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-8 w-8 flex-none items-center justify-center border border-sched-hair text-sched-text-muted transition-colors hover:border-sched-accent hover:text-sched-accent"
          >
            <X width={14} height={14} strokeWidth={2} />
          </button>
        </div>

        {member.blurb && (
          <p className="text-pretty px-6 py-5 text-[13px] leading-[1.7] text-sched-text-muted">
            {member.blurb}
          </p>
        )}

        {member.linkedinUrl && (
          <div className="px-6 pb-6 pt-1">
            <a
              href={member.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-[50px] w-full items-center justify-center gap-[9px] text-xs font-medium tracking-[0.14em] text-white"
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
        )}
      </div>
    </div>
  );
}
