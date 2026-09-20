"use client";

import { useEffect, useRef } from "react";
import { X } from "@/components/icons";
import { LEVEL_META, initialsOf, levelMeta, partKey } from "@/lib/cs-comp";
import type { Challenge, Claim } from "@/lib/cscomp-api";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function LevelPartPicker({
  picker,
  challenges,
  currentLevel,
  currentPart,
  solved,
  claims,
  meClerkId,
  onSelectLevel,
  onBackToLevels,
  onSelectPart,
  onClose,
}: {
  picker: "levels" | number;
  challenges: Challenge[];
  currentLevel: number;
  currentPart: number;
  solved: Record<string, boolean>;
  claims: Claim[];
  meClerkId: string;
  onSelectLevel: (n: number) => void;
  onBackToLevels: () => void;
  onSelectPart: (level: number, part: number) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onParts = typeof picker === "number";

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => trigger?.focus?.();
  }, []);

  // The backdrop has no scroll container of its own, so without this a
  // wheel/trackpad scroll anywhere outside the panel falls through to the
  // page behind the modal instead of doing nothing.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  useEffect(() => {
    panelRef.current?.focus();
  }, [picker]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (active === last || active === panelRef.current)
      ) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // The levels on offer are whatever was actually seeded, not whatever
  // LEVEL_META happens to describe — the metadata is styling, the
  // challenge list is the truth.
  const levels = LEVEL_META.filter((l) =>
    challenges.some((c) => c.level === l.n),
  );
  const partsOf = (n: number) =>
    challenges.filter((c) => c.level === n).sort((a, b) => a.part - b.part);

  // Claims are team-wide, so a part shows who on your squad has it.
  const claimFor = (challengeId: string) =>
    claims.find((c) => c.challengeId === challengeId) ?? null;

  const meta = onParts ? levelMeta(picker) : null;
  const title = meta ? `LEVEL ${picker} · ${meta.name}` : "Choose a level";
  const note = meta ? `${meta.note}` : null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-0 lg:px-5"
      style={{ background: "rgba(6,11,9,.72)" }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Choose level and part"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="animate-sched-sheet max-h-[88%] w-full overflow-y-auto border-t border-sched-accent-dim bg-sched-bg font-mono outline-none lg:max-h-[80vh] lg:w-[760px] lg:animate-sched-pop lg:border"
        style={{
          borderColor: "rgba(110,231,135,.34)",
          boxShadow: "0 26px 60px rgba(0,0,0,.55)",
        }}
      >
        <div className="flex items-center gap-3.5 border-b border-sched-row-line px-[22px] py-5">
          {onParts && (
            <button
              type="button"
              onClick={onBackToLevels}
              className="min-h-[38px] border border-sched-hair px-3.5 font-mono text-[10px] font-medium tracking-[0.14em] text-sched-accent"
            >
              ← LEVELS
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-display text-[23px] font-semibold tracking-[0.03em] text-sched-cream">
              {title}
            </div>
            {note && (
              <div className="mt-[5px] font-mono text-[11px] text-sched-text-muted">
                {note}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-[34px] w-[34px] items-center justify-center text-sched-text-muted hover:text-sched-cream"
          >
            <X width={17} height={17} strokeWidth={2} />
          </button>
        </div>

        {!onParts && (
          <div className="flex flex-col px-[22px] pb-[22px] pt-3.5">
            {levels.map((l) => {
              const parts = partsOf(l.n);
              const got = parts.filter(
                (c) => solved[partKey(l.n, c.part)],
              ).length;
              const here = l.n === currentLevel;
              return (
                <button
                  key={l.n}
                  type="button"
                  onClick={() => onSelectLevel(l.n)}
                  className="mt-2.5 flex min-h-[74px] items-center gap-4 px-4 py-3.5 text-left first:mt-0 hover:border-sched-accent"
                  style={{
                    background: here
                      ? "#16241c"
                      : "var(--color-sched-bg-raised)",
                    border: `1px solid ${here ? l.color : "var(--color-sched-hair)"}`,
                  }}
                >
                  <span
                    className="flex h-[46px] w-[46px] flex-none items-center justify-center font-mono text-[17px] font-medium"
                    style={{ border: `2px solid ${l.color}`, color: l.color }}
                  >
                    {l.n}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
                    <span className="font-display text-lg font-semibold tracking-[0.05em] text-sched-cream">
                      {l.name}
                    </span>
                    <span className="font-mono text-[11px] text-sched-text-muted">
                      {l.note}
                    </span>
                  </span>
                  <span
                    className="flex-none font-mono text-[13px] font-medium"
                    style={{ color: l.color }}
                  >
                    {got}/{parts.length} solved
                  </span>
                  <span className="flex-none font-mono text-[15px] text-sched-text-muted">
                    ›
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {onParts && (
          <div className="grid grid-cols-1 gap-3 px-[22px] pb-6 pt-[18px] sm:grid-cols-2 lg:grid-cols-5">
            {partsOf(picker).map((c) => {
              const isDone = !!solved[partKey(c.level, c.part)];
              const here = c.level === currentLevel && c.part === currentPart;
              const claim = claimFor(c.id);
              const isYou = claim !== null && claim.clerkId === meClerkId;
              const color = levelMeta(c.level).color;
              const status = isDone
                ? "SOLVED"
                : claim
                  ? isYou
                    ? "YOURS"
                    : "TAKEN"
                  : here
                    ? "YOU ARE HERE"
                    : "FREE";
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectPart(c.level, c.part)}
                  className="flex min-h-[150px] flex-col gap-2.5 px-3.5 py-3.5 text-left hover:border-sched-accent"
                  style={{
                    background: here
                      ? "#16241c"
                      : "var(--color-sched-bg-raised)",
                    border: `1px solid ${here ? color : "var(--color-sched-hair)"}`,
                  }}
                >
                  <span
                    className="font-mono text-[10px] tracking-[0.16em]"
                    style={{ color: isDone ? "#6ee787" : color }}
                  >
                    PART {c.part}
                  </span>
                  <span className="font-display text-[15px] font-semibold leading-[1.25] tracking-[0.03em] text-sched-cream">
                    {c.name}
                  </span>
                  <span className="font-mono text-[10px] text-sched-text-muted">
                    {c.points} pts
                  </span>
                  <span className="flex-1" />
                  <span className="flex min-h-[26px] items-center gap-[7px]">
                    <span
                      className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full font-mono text-[8px] font-medium"
                      style={{
                        border: `2px solid ${
                          claim
                            ? isYou
                              ? "#6ee787"
                              : "rgba(127,148,130,.7)"
                            : "rgba(63,143,87,.3)"
                        }`,
                        color: claim
                          ? isYou
                            ? "#6ee787"
                            : "rgba(127,148,130,.7)"
                          : "rgba(63,143,87,.3)",
                      }}
                    >
                      {claim ? initialsOf(claim.name) : "—"}
                    </span>
                    <span className="font-mono text-[9px] tracking-[0.1em] text-sched-text-muted">
                      {status}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
