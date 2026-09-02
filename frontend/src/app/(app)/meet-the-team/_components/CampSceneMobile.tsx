"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Pause, Play } from "@/components/icons";
import type { TeamMember } from "@/lib/team";
import CampScene, { SCENE_HEIGHT, SCENE_WIDTH } from "./CampScene";

// The camp scene is a hand-placed 1436x786 canvas — too wide to fit a phone
// screen at full size, so on mobile it's scaled down to a strip and panned
// horizontally instead. The pan is driven by the same clock as the sun's
// left/right sweep, so the visible slice tracks wherever the sun currently is
// (letting the sun cross the whole scene once per cycle rather than mostly
// sitting off-screen the way the desktop's huge drift path does).
//
// The strip's height is measured rather than fixed: it takes whatever the
// banner and controls bar below leave over in TeamView's h-svh column, which
// is what makes the phone layout add up to exactly one screen on any handset.
// Only used as the pre-measurement fallback.
const FALLBACK_SCENE_HEIGHT = 320;
const PAN_PERIOD_MS = 42000;
const SUN_LEFT_MIN = 4;
const SUN_LEFT_MAX = 96;
const SUN_TOP_BASE = 30;
const SUN_ARC = 16;
const STATE_UPDATE_INTERVAL_MS = 45;

// Triangle wave: 0 -> 1 -> 0 over one period, so the pan and the sun reverse
// direction at the ends instead of snapping back.
function triangleWave(elapsedMs: number): number {
  const phase = (elapsedMs % PAN_PERIOD_MS) / PAN_PERIOD_MS;
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}

// Exposed so TeamView can force playback back on when the member modal
// (a sibling, not a descendant of this component) closes — see resume()
// below for why this reuses togglePaused rather than duplicating it.
export interface CampSceneMobileHandle {
  resume: () => void;
}

const CampSceneMobile = forwardRef<
  CampSceneMobileHandle,
  {
    members: TeamMember[];
    selectedId: string | null;
    onSelect: (id: string) => void;
  }
>(function CampSceneMobile({ members, selectedId, onSelect }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const maxScrollRef = useRef(0);
  const elapsedRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const lastStateUpdateRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pausedRef = useRef(false);

  const [paused, setPausedState] = useState(false);
  const [sun, setSun] = useState({
    leftPct: SUN_LEFT_MIN,
    topPct: SUN_TOP_BASE,
  });
  const [progress, setProgress] = useState(0);
  const [thumbWidthPct, setThumbWidthPct] = useState(100);
  const [sceneHeight, setSceneHeight] = useState(FALLBACK_SCENE_HEIGHT);

  const scale = sceneHeight / SCENE_HEIGHT;
  const scaledWidth = SCENE_WIDTH * scale;

  // The strip's height comes from the flex row it sits in, so observing the
  // container can't loop: the content we size from it never feeds back into it.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { height } = entry.contentRect;
      if (height > 0) setSceneHeight(height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Re-measure the pan extent after the scaled content has actually been laid
  // out at the new size — scrollWidth is still the old value during the render
  // that changes the scale.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || el.scrollWidth === 0) return;
    maxScrollRef.current = Math.max(0, el.scrollWidth - el.clientWidth);
    setThumbWidthPct(Math.min(100, (el.clientWidth / el.scrollWidth) * 100));
  }, [scaledWidth, sceneHeight]);

  function applyProgress(t: number) {
    const el = containerRef.current;
    if (el) el.scrollLeft = t * maxScrollRef.current;
    const now = performance.now();
    if (now - lastStateUpdateRef.current >= STATE_UPDATE_INTERVAL_MS) {
      lastStateUpdateRef.current = now;
      setProgress(t);
      setSun({
        leftPct: SUN_LEFT_MIN + (SUN_LEFT_MAX - SUN_LEFT_MIN) * t,
        topPct: SUN_TOP_BASE - SUN_ARC * Math.sin(Math.PI * t),
      });
    }
  }

  useEffect(() => {
    function tick(now: number) {
      if (pausedRef.current) return;
      if (lastFrameRef.current !== null) {
        elapsedRef.current += now - lastFrameRef.current;
      }
      lastFrameRef.current = now;
      applyProgress(triangleWave(elapsedRef.current));
      rafRef.current = requestAnimationFrame(tick);
    }
    if (!paused) {
      lastFrameRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [paused]);

  function pauseForManualInteraction() {
    pausedRef.current = true;
    setPausedState(true);
  }

  function togglePaused() {
    setPausedState((p) => {
      const next = !p;
      pausedRef.current = next;
      if (!next) {
        // Resume moving forward from wherever the view currently sits,
        // rather than jumping back to the point it was paused at.
        elapsedRef.current = progress * (PAN_PERIOD_MS / 2);
      }
      return next;
    });
  }

  // pausedRef (not the paused prop/state) is checked here because it's always
  // current — reading `paused` directly would close over a stale value from
  // whatever render last called resume(). Reuses togglePaused's un-pause
  // branch rather than duplicating the elapsedRef bookkeeping.
  useImperativeHandle(ref, () => ({
    resume() {
      if (pausedRef.current) togglePaused();
    },
  }));

  function seekFromClientX(clientX: number, trackEl: HTMLDivElement) {
    const rect = trackEl.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    applyProgress(ratio);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={containerRef}
        onPointerDown={pauseForManualInteraction}
        onWheel={pauseForManualInteraction}
        className="min-h-0 grow shrink basis-0 overflow-x-auto overflow-y-hidden"
      >
        <div
          style={{
            width: scaledWidth,
            height: sceneHeight,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: SCENE_WIDTH,
              height: SCENE_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <CampScene
              members={members}
              selectedId={selectedId}
              onSelect={onSelect}
              sun={{ ...sun, animated: false, periodSeconds: 0 }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-none items-center gap-3 bg-sched-bg-raised px-4 py-2">
        <button
          type="button"
          onClick={togglePaused}
          aria-label={paused ? "Resume scene drift" : "Pause scene drift"}
          className="flex h-7 w-7 flex-none items-center justify-center text-sched-accent"
        >
          {paused ? (
            <Play width={15} height={15} />
          ) : (
            <Pause width={15} height={15} />
          )}
        </button>
        <div
          role="slider"
          aria-label="Scene position"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          tabIndex={0}
          onPointerDown={(e) => {
            pauseForManualInteraction();
            seekFromClientX(e.clientX, e.currentTarget);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (e.buttons !== 1) return;
            seekFromClientX(e.clientX, e.currentTarget);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              pauseForManualInteraction();
              applyProgress(Math.max(0, progress - 0.05));
            } else if (e.key === "ArrowRight") {
              pauseForManualInteraction();
              applyProgress(Math.min(1, progress + 0.05));
            }
          }}
          className="relative h-[6px] flex-1 cursor-pointer bg-sched-hair"
        >
          <div
            className="absolute top-0 h-full bg-sched-accent"
            style={{
              width: `${thumbWidthPct}%`,
              left: `${progress * (100 - thumbWidthPct)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
});

export default CampSceneMobile;
