"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { levelMeta } from "@/lib/cs-comp";
import {
  fetchTargetURL,
  PASS_THRESHOLD,
  type Challenge,
  type SubmitResult,
} from "@/lib/cscomp-api";

// The mockup feeds the textarea straight into the output iframe's srcDoc,
// reloading it on every keystroke. Debouncing keeps typing smooth once the
// user is mid-scene rather than fighting an iframe reload per character.
const PREVIEW_DEBOUNCE_MS = 250;

// The challenge canvas, matching the renderer's viewport (see render.go).
const TARGET_W = 300;
const TARGET_H = 200;

function toHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export default function BattlePanel({
  challenge,
  myTeamName,
  myTeamColor,
  code,
  solved,
  best,
  attempts,
  result,
  claimedByMe,
  claimedByName,
  busy,
  diff,
  onToggleDiff,
  onChangeCode,
  onReset,
  onSubmit,
  onClaim,
  onUnclaim,
  onOpenPicker,
}: {
  challenge: Challenge;
  myTeamName: string;
  myTeamColor: string;
  code: string;
  solved: boolean;
  best: number | null;
  attempts: number;
  result: SubmitResult | null;
  claimedByMe: boolean;
  claimedByName: string | null;
  busy: boolean;
  diff: boolean;
  onToggleDiff: () => void;
  onChangeCode: (value: string) => void;
  onReset: () => void;
  onSubmit: () => void;
  onClaim: () => void;
  onUnclaim: () => void;
  onOpenPicker: () => void;
}) {
  const { getToken } = useAuth();
  const gutterRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLImageElement>(null);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewCode, setPreviewCode] = useState(code);
  // Tagged with the challenge it belongs to, so switching parts shows the
  // loading state rather than the previous part's target for a frame —
  // without clearing state synchronously inside the effect below.
  const [target, setTarget] = useState<{ id: string; url: string } | null>(
    null,
  );

  useEffect(() => {
    const t = setTimeout(() => setPreviewCode(code), PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [code]);

  // The target is the exact PNG the server diffs against, fetched rather
  // than rebuilt locally — a target drawn from a second copy of the scene
  // could drift from the one that actually scores you. It needs the auth
  // header, so it arrives as a blob URL instead of an <img src>.
  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    async function load() {
      try {
        const token = await getToken();
        const next = await fetchTargetURL(token, challenge.id);
        if (cancelled) {
          URL.revokeObjectURL(next);
          return;
        }
        url = next;
        setTarget({ id: challenge.id, url: next });
      } catch {
        if (!cancelled) setTarget(null);
      }
    }
    load();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [challenge.id, getToken]);

  const targetURL = target?.id === challenge.id ? target.url : null;
  const lv = levelMeta(challenge.level);

  async function copyHex(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
    } catch {
      // Clipboard permission can be refused; the hex is on screen to read
      // either way, so this is not worth an error banner.
      setCopied(false);
    }
  }

  // Samples a pixel out of the target image itself, rather than out of any
  // local copy of the scene: this is the same PNG the server diffs against,
  // so the colour the dropper reports is the colour that scores.
  function sampleTarget(e: React.MouseEvent<HTMLImageElement>) {
    const img = targetRef.current;
    if (!img || !img.complete || img.naturalWidth === 0) return;

    // The image is transform-scaled, so go through its visual box instead
    // of offsetX/offsetY, which are not in the scaled coordinate space.
    const rect = img.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * TARGET_W);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * TARGET_H);
    if (x < 0 || y < 0 || x >= TARGET_W || y >= TARGET_H) return;

    const canvas = document.createElement("canvas");
    canvas.width = TARGET_W;
    canvas.height = TARGET_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, TARGET_W, TARGET_H);

    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    const hex = toHex(r, g, b);
    setPicked(hex);
    setCopied(false);
    void copyHex(hex);
  }
  const gutter = useMemo(
    () =>
      code
        .split("\n")
        .map((_, i) => i + 1)
        .join("\n"),
    [code],
  );

  // What the last attempt scored, phrased against the pass mark. The
  // server decides — this only reports what it sent back.
  const verdict = result
    ? result.solved
      ? `SOLVED · ${result.matchPercent.toFixed(1)}% match · +${result.points} pts`
      : `${result.matchPercent.toFixed(1)}% match · needs ${PASS_THRESHOLD}% · best ${result.best.toFixed(1)}%`
    : best !== null
      ? `best ${best.toFixed(1)}% over ${attempts} ${attempts === 1 ? "attempt" : "attempts"}`
      : null;

  return (
    <div className="bg-sched-bg px-5 pb-14 pt-[26px] lg:px-[60px] lg:pb-[60px]">
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <span
          className="border border-sched-accent-dim bg-[#16241c] px-[11px] py-1.5 font-mono text-[10px] font-medium tracking-[0.16em]"
          style={{ color: lv.color }}
        >
          LEVEL {challenge.level} · {lv.name}
        </span>
        <span className="font-display text-2xl font-semibold tracking-[0.03em] text-sched-cream">
          {challenge.name}
        </span>
        <span className="font-mono text-[11px] tracking-[0.14em] text-sched-text-muted">
          {challenge.points} PTS
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

      {/* Claims are how a squad splits the 30 parts without two people
          building the same scene. One per person per level, so the button
          is also the only place that rule becomes visible. */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {claimedByMe ? (
          <>
            <span className="font-mono text-[11px] tracking-[0.14em] text-sched-accent">
              ✓ YOU CLAIMED THIS PART
            </span>
            <button
              type="button"
              onClick={onUnclaim}
              disabled={busy}
              className="min-h-9 border border-sched-hair px-3.5 font-mono text-[10px] font-medium tracking-[0.14em] text-sched-text-muted transition-colors hover:border-sched-coral hover:text-sched-coral disabled:cursor-not-allowed disabled:opacity-50"
            >
              RELEASE CLAIM
            </button>
          </>
        ) : claimedByName ? (
          <span className="font-mono text-[11px] tracking-[0.14em] text-sched-text-muted">
            CLAIMED BY {claimedByName.toUpperCase()} · you can still submit
          </span>
        ) : (
          <button
            type="button"
            onClick={onClaim}
            disabled={busy}
            className="min-h-9 border border-sched-accent-dim px-3.5 font-mono text-[10px] font-medium tracking-[0.14em] text-sched-accent transition-colors hover:bg-[#16241c] hover:text-sched-cream disabled:cursor-not-allowed disabled:opacity-50"
          >
            CLAIM THIS PART
          </button>
        )}
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
              disabled={busy}
              className="min-h-[46px] px-[22px] font-mono text-xs font-medium tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: solved ? "#16241c" : "#6ee787",
                border: `1px solid ${solved ? "var(--color-sched-accent-dim)" : "#6ee787"}`,
                color: solved ? "#6ee787" : "#0b1310",
              }}
            >
              {busy
                ? "SCORING…"
                : solved
                  ? "✓ SOLVED · SUBMIT AGAIN"
                  : "SUBMIT SOLUTION"}
            </button>
            <button
              type="button"
              onClick={onReset}
              disabled={busy}
              className="min-h-[46px] border border-sched-hair px-4.5 font-mono text-xs font-medium tracking-[0.14em] text-sched-text-muted transition-colors hover:border-sched-accent-dim hover:text-sched-cream disabled:cursor-not-allowed disabled:opacity-50"
            >
              RESET
            </button>
            <div className="flex-1" />
            {verdict ? (
              <span
                className="font-mono text-[11px] font-medium"
                style={{
                  color: result?.solved || solved ? "#6ee787" : "#e9f5cd",
                }}
              >
                {verdict}
              </span>
            ) : (
              <span className="font-mono text-[11px] text-sched-text-muted">
                scored on the server · {PASS_THRESHOLD}% match to pass
              </span>
            )}
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

              {/* Last sampled colour. Clicking re-copies it, for when the
                  automatic copy on pick was refused or overwritten. */}
              {picked && (
                <button
                  type="button"
                  onClick={() => copyHex(picked)}
                  title="Copy this hex"
                  className="flex items-center gap-1.5 border border-sched-hair px-2 py-1 font-mono text-[10px] tracking-[0.1em] text-sched-cream transition-colors hover:border-sched-accent-dim"
                >
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 flex-none border border-[rgba(233,245,205,.25)]"
                    style={{ background: picked }}
                  />
                  {picked}
                  <span className="text-sched-text-muted">
                    {copied ? "COPIED" : "COPY"}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setPicking((p) => !p)}
                disabled={!targetURL}
                title="Sample a colour straight off the target"
                aria-pressed={picking}
                className="min-h-[26px] px-2.5 font-mono text-[10px] font-medium tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: picking ? "#6ee787" : "none",
                  border: `1px solid ${picking ? "#6ee787" : "var(--color-sched-hair)"}`,
                  color: picking ? "#0b1310" : "#7f9482",
                }}
              >
                {picking ? "CLICK THE TARGET" : "PICK COLOUR"}
              </button>
            </div>
            <div className="flex h-[300px] items-center justify-center bg-[#0d1712]">
              {targetURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  ref={targetRef}
                  src={targetURL}
                  alt={`Target: ${challenge.name}`}
                  width={300}
                  height={200}
                  onClick={picking ? sampleTarget : undefined}
                  style={{
                    transform: "scale(1.5)",
                    imageRendering: "pixelated",
                    cursor: picking ? "crosshair" : "default",
                  }}
                />
              ) : (
                <span className="font-mono text-[11px] text-sched-text-muted">
                  Loading target…
                </span>
              )}
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
              <iframe
                title="Your output"
                srcDoc={previewCode}
                sandbox=""
                scrolling="no"
                style={{
                  width: 300,
                  height: 200,
                  border: 0,
                  transform: "scale(1.5)",
                }}
              />
              {/* Onion-skin overlay, not a difference blend — a faint outline
                  of the target sitting on top of your real colors reads much
                  more clearly than the two layers cancelling each other out. */}
              {diff && targetURL && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  aria-hidden="true"
                  alt=""
                  src={targetURL}
                  width={300}
                  height={200}
                  className="absolute"
                  style={{
                    transform: "scale(1.5)",
                    opacity: 0.4,
                    imageRendering: "pixelated",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
