"use client";

import { useEffect, useState } from "react";

// Browser zoom relative to page load: >1 zoomed in, <1 zoomed out, 1 at rest.
//
// Browser zoom changes window.devicePixelRatio; resizing a window does not.
// That is the only reliable way to tell the two apart — a width breakpoint
// can't, because zoom is deliberately indistinguishable from a smaller window.
// A genuine resize re-baselines, so resizing while zoomed re-establishes "1"
// at the new size, matching how ViewportFloor re-measures its floor.
//
// Read from the resize event rather than from a ResizeObserver on the consumer:
// resize always fires on zoom, whereas an observed box whose size is pinned by
// ViewportFloor's floor does not change on zoom and so would never fire,
// leaving the observer's stored ratio stale.
export function useZoom(): number {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let base = window.devicePixelRatio;
    let last = base;

    const onResize = () => {
      const now = window.devicePixelRatio;
      if (now === last) base = now; // unchanged ratio => a real resize
      last = now;
      setZoom(now / base);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return zoom;
}
