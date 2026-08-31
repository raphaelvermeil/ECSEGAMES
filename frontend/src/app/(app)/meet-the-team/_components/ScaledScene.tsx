"use client";

import { useEffect, useRef, useState } from "react";
import { SCENE_HEIGHT, SCENE_WIDTH } from "./CampScene";

// Scales the fixed 1916x786 camp scene to fit the box it's given, picking
// whichever of width/height is the tighter constraint so it never overflows
// either dimension (no page scroll, no overlapping the footer below it).
// Whichever axis has slack gets a background that continues CampScene's own
// flat sky/ground bands, so the leftover space reads as more scene rather
// than empty space. Keep the colors/stops below in sync with every full-bleed
// (left:0,right:0) SCENE_DECOR entry in CampScene.tsx — a band missing here
// shows up as a hard seam where the real scene's edge meets this tint.
const TOP_BOTTOM_GRADIENT =
  "linear-gradient(#233b52 0%, #233b52 50%, #1f4831 50%, #1f4831 100%)";

function bandStop(px: number): string {
  return `${((px / SCENE_HEIGHT) * 100).toFixed(2)}%`;
}

// Mirrors every full-bleed SCENE_DECOR band, including the thin grass
// highlight lines (5c8f4e/54864a/457642) and the dirt path with its inset
// light/dark edges (8a7550/6b5a3f/59492f) — without these the margin was
// flat grass while the real scene had a path and highlight lines crossing
// the same rows, so they visibly stopped dead at the scene's edge.
const FULL_BAND_GRADIENT = `linear-gradient(to bottom,
  #233b52 0%, #233b52 ${bandStop(118)},
  #3c4a5e ${bandStop(118)}, #3c4a5e ${bandStop(184)},
  #6b5560 ${bandStop(184)}, #6b5560 ${bandStop(232)},
  #a3695a ${bandStop(232)}, #a3695a ${bandStop(270)},
  #d99a5b ${bandStop(270)}, #d99a5b ${bandStop(294)},
  #5c8f4e ${bandStop(294)}, #5c8f4e ${bandStop(301)},
  #2c5e40 ${bandStop(301)}, #2c5e40 ${bandStop(430)},
  #54864a ${bandStop(430)}, #54864a ${bandStop(436)},
  #28563b ${bandStop(436)}, #28563b ${bandStop(512)},
  #8a7550 ${bandStop(512)}, #8a7550 ${bandStop(517)},
  #6b5a3f ${bandStop(517)}, #6b5a3f ${bandStop(564)},
  #59492f ${bandStop(564)}, #59492f ${bandStop(568)},
  #28563b ${bandStop(568)}, #28563b ${bandStop(700)},
  #457642 ${bandStop(700)}, #457642 ${bandStop(706)},
  #1f4831 ${bandStop(706)}, #1f4831 100%)`;

// The dashed centerline painted on the path (CampScene's top:538 height:3
// repeating-linear-gradient) — layered above FULL_BAND_GRADIENT and confined
// to that one row via backgroundSize/position, since it isn't a flat color
// and so can't be folded into the gradient's stop list like the bands above.
const ROAD_DASH_IMAGE =
  "repeating-linear-gradient(90deg, rgba(233,245,205,.32) 0 26px, transparent 26px 60px)";
const ROAD_DASH_TOP = bandStop(538);
const ROAD_DASH_HEIGHT = bandStop(3);

export default function ScaledScene({
  children,
}: {
  children: React.ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  // "width" = width is the tighter constraint (fills full width, any slack
  // is above/below). "height" = height is tighter (fills full height, any
  // slack is left/right).
  const [axis, setAxis] = useState<"width" | "height">("width");

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const scaleByWidth = width / SCENE_WIDTH;
      const scaleByHeight = height / SCENE_HEIGHT;
      if (scaleByWidth <= scaleByHeight) {
        setScale(scaleByWidth);
        setAxis("width");
      } else {
        setScale(scaleByHeight);
        setAxis("height");
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
        // Longhand (never the `background` shorthand) so switching axes
        // between renders can't leave stale sub-properties behind.
        backgroundImage:
          axis === "width"
            ? TOP_BOTTOM_GRADIENT
            : `${ROAD_DASH_IMAGE}, ${FULL_BAND_GRADIENT}`,
        backgroundSize:
          axis === "width"
            ? "100% 100%"
            : `100% ${ROAD_DASH_HEIGHT}, 100% 100%`,
        backgroundPosition:
          axis === "width" ? "0 0" : `0 ${ROAD_DASH_TOP}, 0 0`,
        backgroundRepeat:
          axis === "width" ? "no-repeat" : "repeat-x, no-repeat",
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
