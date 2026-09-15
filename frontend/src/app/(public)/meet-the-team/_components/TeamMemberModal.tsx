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
      // No blur: with real photos in the scene behind it, blurring the whole
      // backdrop reads as a rendering glitch rather than a dimmed background.
      className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto p-0 lg:items-center lg:p-5"
      style={{ background: "rgba(4,9,7,.72)" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={member.name}
        onClick={(e) => e.stopPropagation()}
        className="animate-sched-sheet relative w-full max-w-[440px] border-t border-sched-accent-dim bg-[#0f1512] px-8 py-8 text-center font-mono lg:animate-sched-pop lg:border"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-sched-text-muted transition-colors hover:text-sched-cream"
        >
          <X width={16} height={16} strokeWidth={2} />
        </button>

        <div
          className="relative mx-auto flex h-[136px] w-[136px] items-center justify-center overflow-hidden rounded-full font-mono text-[34px] font-semibold"
          style={{
            border: `2px solid ${crew.color}`,
            background: "#16241c",
            color: crew.color,
          }}
        >
          {member.photoPath ? (
            <Image
              src={member.photoPath}
              alt=""
              fill
              sizes="136px"
              style={{ objectFit: "cover" }}
            />
          ) : (
            initials(member.name)
          )}
        </div>

        <div className="mt-5 font-display text-[26px] font-semibold leading-none tracking-[0.02em] text-sched-cream">
          {member.name}
        </div>

        <div
          className="mx-auto mt-4 inline-block border px-3 py-[6px] text-[10px] font-medium tracking-[0.16em]"
          style={{ borderColor: crew.color, color: crew.color }}
        >
          {crew.role}
        </div>

        <div className="mt-3 text-[13px] text-sched-text-muted">
          {member.program}
        </div>

        {member.blurb && (
          <p className="text-pretty mt-4 text-[13px] leading-[1.7] text-sched-text-muted">
            {member.blurb}
          </p>
        )}

        {member.linkedinUrl && (
          <a
            href={member.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 flex min-h-[50px] w-full items-center justify-center gap-[9px] text-xs font-medium tracking-[0.14em] text-white"
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
        )}
      </div>
    </div>
  );
}
