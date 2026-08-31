"use client";

import { useEffect, useRef, useState } from "react";
import { SCENE_HEIGHT, SCENE_WIDTH } from "./CampScene";

// Scales the fixed 1436x786 camp scene to always fill the width it's given
// (no side letterboxing), keeping its aspect ratio so nothing distorts.
export default function ScaledScene({
  children,
}: {
  children: React.ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / SCENE_WIDTH);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{
        width: "100%",
        height: SCENE_HEIGHT * scale,
        overflow: "hidden",
        position: "relative",
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
        {children}
      </div>
    </div>
  );
}
