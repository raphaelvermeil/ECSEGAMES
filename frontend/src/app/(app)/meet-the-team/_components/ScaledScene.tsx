"use client";

import { useEffect, useRef, useState } from "react";
import { useZoom } from "../../useZoom";
import { SCENE_HEIGHT, SCENE_WIDTH } from "./CampScene";

// Scales the fixed 1916x786 camp scene to fit the box it's given, picking
// whichever of width/height is the tighter constraint so it never overflows
// either dimension (no page scroll, no overlapping the footer below it).
//
// The fit is then multiplied by min(1, zoom) so that zooming OUT shrinks the
// art. Without it, zooming out grew the CSS viewport by exactly the factor the
// browser was shrinking by, the scene re-fitted to the bigger box, and the two
// cancelled — the camp stayed the same size on the glass and zoom-out looked
// like it did nothing. Holding the CSS size still instead lets the browser do
// the shrinking. Zooming IN needs no such term: ViewportFloor already pins the
// box's CSS size, so the fit stays put and the browser magnifies it.
//
// Whatever space that leaves around the art is painted with a continuation of
// CampScene's own full-bleed bands, so it reads as more landscape rather than
// empty space. The stops are mapped through the art's rendered rect, so they
// stay aligned with the real bands at any scale and on any side.

// [scene-space y, colour] for every full-bleed SCENE_DECOR band, in paint
// order. Keep in sync with CampScene.tsx — a band missing here shows up as a
// hard seam where the real scene's edge meets this tint.
const BAND_EDGES: [number, string][] = [
  [0, "#233b52"], // sky
  [118, "#3c4a5e"],
  [184, "#6b5560"],
  [232, "#a3695a"],
  [270, "#d99a5b"],
  [294, "#5c8f4e"], // grass highlight line
  [301, "#2c5e40"],
  [430, "#54864a"], // grass highlight line
  [436, "#28563b"],
  [512, "#8a7550"], // path inset top highlight
  [517, "#6b5a3f"], // path body
  [564, "#59492f"], // path inset bottom shadow
  [568, "#28563b"],
  [700, "#457642"], // grass highlight line
  [706, "#1f4831"], // ground
];

// The dashed centreline painted on the path (CampScene's top:538 height:3
// repeating-linear-gradient). It isn't a flat colour, so it can't be folded
// into the band list above and rides as its own background layer.
const DASH_TOP = 538;
const DASH_HEIGHT = 3;
const DASH_ON = 26;
const DASH_PERIOD = 60;

interface Rect {
  scale: number;
  top: number;
  left: number;
  boxH: number;
}

// Maps a scene-space y onto a percentage of the wrapper, via wherever the art
// actually landed. Clamping is what fills the space above the art with sky and
// below it with ground: those stops collapse onto 0%/100%.
function bandStops({ scale, top, boxH }: Rect): string {
  if (boxH <= 0) return "";
  return BAND_EDGES.map(([y, colour], i) => {
    const pct = ((top + y * scale) / boxH) * 100;
    const at = `${Math.max(0, Math.min(100, pct)).toFixed(3)}%`;
    const next = BAND_EDGES[i + 1];
    const endPct = next ? ((top + next[0] * scale) / boxH) * 100 : 100;
    const end = `${Math.max(0, Math.min(100, endPct)).toFixed(3)}%`;
    return `${colour} ${i === 0 ? "0%" : at}, ${colour} ${next ? end : "100%"}`;
  }).join(", ");
}

export default function ScaledScene({
  children,
}: {
  children: React.ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const zoom = useZoom();

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ w: width, h: height });
      setFit(Math.min(width / SCENE_WIDTH, height / SCENE_HEIGHT));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = fit * Math.min(1, zoom);
  const artW = SCENE_WIDTH * scale;
  const artH = SCENE_HEIGHT * scale;
  const rect: Rect = {
    scale,
    top: (box.h - artH) / 2,
    left: (box.w - artW) / 2,
    boxH: box.h,
  };

  // Dash geometry follows the art so the margin's dashes line up with the
  // scene's own rather than running at a different size and phase.
  const dashOn = DASH_ON * scale;
  const dashPeriod = DASH_PERIOD * scale;

  return (
    <div
      ref={wrapperRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Longhand (never the `background` shorthand) so a re-render can't
        // leave stale sub-properties behind.
        backgroundImage: `repeating-linear-gradient(90deg, rgba(233,245,205,.32) 0 ${dashOn}px, transparent ${dashOn}px ${dashPeriod}px), linear-gradient(to bottom, ${bandStops(rect)})`,
        backgroundSize: `100% ${DASH_HEIGHT * scale}px, 100% 100%`,
        backgroundPosition: `${rect.left}px ${rect.top + DASH_TOP * scale}px, 0 0`,
        backgroundRepeat: "repeat-x, no-repeat",
      }}
    >
      <div
        style={{
          flex: "none",
          width: SCENE_WIDTH,
          height: SCENE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
