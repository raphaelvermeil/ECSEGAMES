"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { targetDoc, type Level, type Part } from "@/lib/cs-comp";

// The mockup feeds the textarea straight into the output iframe's srcDoc,
// reloading it on every keystroke. Debouncing keeps typing smooth once the
// user is mid-scene rather than fighting an iframe reload per character.
const PREVIEW_DEBOUNCE_MS = 250;

export default function BattlePanel({
  lv,
  pt,
  myTeamName,
  myTeamColor,
  code,
  isDone,
  diff,
  onToggleDiff,
  onChangeCode,
  onReset,
  onSubmit,
  onOpenPicker,
}: {
  lv: Level;
  pt: Part;
  myTeamName: string;
  myTeamColor: string;
  code: string;
  isDone: boolean;
  diff: boolean;
  onToggleDiff: () => void;
  onChangeCode: (value: string) => void;
  onReset: () => void;
  onSubmit: () => void;
  onOpenPicker: () => void;
}) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const [previewCode, setPreviewCode] = useState(code);

  useEffect(() => {
    const t = setTimeout(() => setPreviewCode(code), PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [code]);

  const target = useMemo(() => targetDoc(lv, pt), [lv, pt]);
  const gutter = useMemo(
    () =>
      code
        .split("\n")
        .map((_, i) => i + 1)
        .join("\n"),
    [code],
  );

  return (
    <div className="bg-sched-bg px-5 pb-14 pt-[26px] lg:px-[60px] lg:pb-[60px]">
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <span
          className="border border-sched-accent-dim bg-[#16241c] px-[11px] py-1.5 font-mono text-[10px] font-medium tracking-[0.16em]"
          style={{ color: lv.color }}
        >
          LEVEL {lv.n} · {lv.name}
        </span>
        <span className="font-display text-2xl font-semibold tracking-[0.03em] text-sched-cream">
          {pt.title}
        </span>
        <button
          type="button"
          onClick={onOpenPicker}
          className="min-h-10 border border-sched-accent-dim px-4 font-mono text-[11px] font-medium tracking-[0.14em] text-sched-accent transition-colors hover:bg-[#16241c] hover:text-sched-cream"
        >
          CHANGE LEVEL / PART
        </button>
        <div className="flex-1" />
        <span className="font-mono text-xs text-sched-text-muted">
          playing for
        </span>
        <span className="flex items-center gap-2.5 font-display text-[17px] font-semibold tracking-[0.05em] text-sched-cream">
          <span className="h-2.5 w-2.5" style={{ background: myTeamColor }} />
          {myTeamName}
        </span>
      </div>

      {/* Phone: the editor + two 300x200 previews need real width to be
          usable, so point the user at a laptop instead of cramming it in. */}
      <div className="border border-sched-hair bg-sched-bg-raised px-5 py-8 text-center lg:hidden">
        <p className="font-mono text-sm leading-[1.7] text-sched-text-muted">
          The battle editor needs a bigger screen. Open CS comp on a laptop to
          write code and see your target + output side by side.
        </p>
      </div>

      <div className="hidden gap-5 lg:flex lg:items-start">
        <div
          className="flex min-w-0 flex-1 flex-col bg-sched-bg-raised"
          style={{ border: "1px solid var(--color-sched-hair)" }}
        >
          <div className="flex items-center gap-3 border-b border-sched-hair bg-[#16241c] px-4 py-3">
            <span className="font-mono text-xs text-sched-cream">
              battle.html
            </span>
            <span className="bg-[rgba(110,231,135,.12)] px-2 py-[3px] font-mono text-[10px] tracking-[0.1em] text-sched-accent">
              HTML + CSS
            </span>
            <div className="flex-1" />
            <span className="font-mono text-[10px] tracking-[0.14em] text-sched-text-muted">
              CHARS
            </span>
            <span className="font-mono text-sm font-medium text-sched-cream">
              {code.length}
            </span>
          </div>
          <div className="flex min-h-0">
            <div
              ref={gutterRef}
              aria-hidden="true"
              className="flex-none overflow-hidden bg-[#0d1712] py-3.5 pr-2.5 text-right font-mono text-xs leading-[1.6] text-[#4d6455]"
              style={{
                width: 46,
                borderRight: "1px solid rgba(63,143,87,.16)",
                height: 566,
              }}
            >
              <div style={{ whiteSpace: "pre" }}>{gutter}</div>
            </div>
            <textarea
              value={code}
              onChange={(e) => onChangeCode(e.target.value)}
              onScroll={(e) => {
                if (gutterRef.current) {
                  gutterRef.current.scrollTop = e.currentTarget.scrollTop;
                }
              }}
              spellCheck={false}
              aria-label="Your HTML and CSS"
              className="min-w-0 flex-1 resize-none bg-[#0d1712] px-4 py-3.5 font-mono text-xs leading-[1.6] text-[#d7ecd2] outline-none"
              style={{ height: 566, tabSize: 2 }}
            />
          </div>
          <div className="flex items-center gap-3.5 border-t border-sched-hair px-4 py-3.5">
            <button
              type="button"
              onClick={onSubmit}
              className="min-h-[46px] px-[22px] font-mono text-xs font-medium tracking-[0.14em]"
              style={{
                background: isDone ? "#16241c" : "#6ee787",
                border: `1px solid ${isDone ? "var(--color-sched-accent-dim)" : "#6ee787"}`,
                color: isDone ? "#6ee787" : "#0b1310",
              }}
            >
              {isDone ? "✓ SUBMITTED · LOCKED IN" : "SUBMIT SOLUTION"}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="min-h-[46px] border border-sched-hair px-4.5 font-mono text-xs font-medium tracking-[0.14em] text-sched-text-muted transition-colors hover:border-sched-accent-dim hover:text-sched-cream"
            >
              RESET
            </button>
            <div className="flex-1" />
            <span className="font-mono text-[11px] text-sched-text-muted">
              renders live · shortest solution wins ties
            </span>
          </div>
        </div>

        <div className="flex w-[520px] flex-none flex-col gap-5">
          <div
            className="bg-sched-bg-raised"
            style={{ border: "1px solid var(--color-sched-hair)" }}
          >
            <div className="flex items-center gap-2.5 border-b border-sched-hair bg-[#16241c] px-4 py-3">
              <span className="font-mono text-[11px] font-medium tracking-[0.16em] text-sched-cream">
                TARGET
              </span>
              <div className="flex-1" />
              <span className="font-mono text-[11px] text-sched-text-muted">
                300 × 200
              </span>
            </div>
            <div className="flex h-[300px] items-center justify-center bg-[#0d1712]">
              <iframe
                title="Target"
                srcDoc={target}
                sandbox=""
                scrolling="no"
                style={{
                  width: 300,
                  height: 200,
                  border: 0,
                  transform: "scale(1.5)",
                }}
              />
            </div>
          </div>

          <div
            className="bg-sched-bg-raised"
            style={{ border: "1px solid var(--color-sched-hair)" }}
          >
            <div className="flex items-center gap-2.5 border-b border-sched-hair bg-[#16241c] px-4 py-3">
              <span className="font-mono text-[11px] font-medium tracking-[0.16em] text-sched-cream">
                YOUR OUTPUT
              </span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={onToggleDiff}
                className="min-h-[34px] px-3 font-mono text-[10px] font-medium tracking-[0.14em]"
                style={{
                  background: diff ? "#6ee787" : "none",
                  border: `1px solid ${diff ? "#6ee787" : "var(--color-sched-hair)"}`,
                  color: diff ? "#0b1310" : "#7f9482",
                }}
              >
                COMPARE
              </button>
            </div>
            <div className="relative flex h-[300px] items-center justify-center overflow-hidden bg-[#0d1712]">
              {diff && (
                <iframe
                  aria-hidden="true"
                  title="Target ghost"
                  srcDoc={target}
                  sandbox=""
                  scrolling="no"
                  className="absolute"
                  style={{
                    width: 300,
                    height: 200,
                    border: 0,
                    transform: "scale(1.5)",
                  }}
                />
              )}
              <iframe
                title="Your output"
                srcDoc={previewCode}
                sandbox=""
                scrolling="no"
                className="relative"
                style={{
                  width: 300,
                  height: 200,
                  border: 0,
                  transform: "scale(1.5)",
                  opacity: diff ? 0.55 : 1,
                  mixBlendMode: diff ? "difference" : "normal",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
