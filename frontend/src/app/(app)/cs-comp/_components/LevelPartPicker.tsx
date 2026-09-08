"use client";

import { useEffect, useRef } from "react";
import { X } from "@/components/icons";
import { LEVELS, TOTAL_PARTS, partKey, type CompMember } from "@/lib/cs-comp";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function LevelPartPicker({
  picker,
  currentLevel,
  currentPart,
  solved,
  roster,
  meMember,
  onSelectLevel,
  onBackToLevels,
  onSelectPart,
  onClose,
}: {
  picker: "levels" | number;
  currentLevel: number;
  currentPart: number;
  solved: Record<string, boolean>;
  roster: CompMember[];
  meMember: CompMember;
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

  const title = onParts
    ? `LEVEL ${picker} · ${LEVELS[picker - 1].name}`
    : "Choose a level";
  const note = onParts
    ? `${LEVELS[picker - 1].note} · pick a part — one per teammate`
    : `${LEVELS.length} levels · 5 parts each · ${TOTAL_PARTS} challenges in the set`;

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
        className="animate-sched-sheet w-full max-h-[88%] overflow-y-auto border-t border-sched-accent-dim bg-sched-bg font-mono outline-none lg:w-[760px] lg:max-h-[80vh] lg:animate-sched-pop lg:border"
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
            <div className="mt-[5px] font-mono text-[11px] text-sched-text-muted">
              {note}
            </div>
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
            {LEVELS.map((l) => {
              const got = l.parts.filter(
                (_, i) => solved[partKey(l.n, i + 1)],
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
                    className="font-mono text-[13px] font-medium"
                    style={{ color: l.color }}
                  >
                    {got}/5 solved
                  </span>
                  <span className="font-mono text-[15px] text-sched-text-muted">
                    ›
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {onParts && (
          <div className="grid grid-cols-1 gap-3 px-[22px] pb-6 pt-[18px] sm:grid-cols-2 lg:grid-cols-5">
            {LEVELS[picker - 1].parts.map((p, i) => {
              const ln = picker;
              const pn = i + 1;
              const isDone = !!solved[partKey(ln, pn)];
              const here = ln === currentLevel && pn === currentPart;
              const who = roster[i] ?? null;
              const isYou = who !== null && who === meMember;
              const status = isDone
                ? "SOLVED"
                : here
                  ? "YOU ARE HERE"
                  : who
                    ? isYou
                      ? "YOURS"
                      : "TAKEN"
                    : "FREE";
              return (
                <button
                  key={pn}
                  type="button"
                  onClick={() => onSelectPart(ln, pn)}
                  className="flex min-h-[150px] flex-col gap-2.5 px-3.5 py-3.5 text-left hover:border-sched-accent"
                  style={{
                    background: here
                      ? "#16241c"
                      : "var(--color-sched-bg-raised)",
                    border: `1px solid ${here ? LEVELS[ln - 1].color : "var(--color-sched-hair)"}`,
                  }}
                >
                  <span
                    className="font-mono text-[10px] tracking-[0.16em]"
                    style={{
                      color: isDone ? "#6ee787" : LEVELS[ln - 1].color,
                    }}
                  >
                    PART {pn}
                  </span>
                  <span className="font-display text-[15px] font-semibold leading-[1.25] tracking-[0.03em] text-sched-cream">
                    {p.title}
                  </span>
                  <span className="font-mono text-[10px] text-sched-text-muted">
                    {p.rects.length} shapes
                  </span>
                  <span className="flex-1" />
                  <span className="flex min-h-[26px] items-center gap-[7px]">
                    <span
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-full font-mono text-[8px] font-medium"
                      style={{
                        border: `2px solid ${
                          who
                            ? isYou
                              ? "#6ee787"
                              : "rgba(127,148,130,.7)"
                            : "rgba(63,143,87,.3)"
                        }`,
                        color: who
                          ? isYou
                            ? "#6ee787"
                            : "rgba(127,148,130,.7)"
                          : "rgba(63,143,87,.3)",
                      }}
                    >
                      {who?.initials ?? "—"}
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
