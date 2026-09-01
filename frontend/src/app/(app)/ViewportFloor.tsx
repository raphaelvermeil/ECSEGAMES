"use client";

import { useEffect } from "react";

// Publishes the viewport size as a floor the desktop shell can grow past but
// never shrink below (see the min-w/min-h consumers in layout.tsx and
// TeamView.tsx). This is what makes browser zoom behave like a normal page:
// the scene is sized to fit the viewport, and zoom shrinks the CSS viewport by
// exactly the factor it magnifies by, so without a floor the two cancel out and
// the scene stays the same physical size at every zoom level — zooming in only
// grew the nav/footer text and squeezed the scene.
//
// Below the floor (zoomed in) the layout keeps its load-time CSS size, so the
// browser magnifies it and the page scrolls. Above it (zoomed out) the normal
// 100%/100vh rules win and the layout expands to fill.
//
// The floor is the user's own viewport at their own zoom, so it's inert at
// rest — it can't reintroduce the old fixed min-w-[1380px] bug where a 1366px
// laptop had hidden sideways scroll at 100%.
export default function ViewportFloor() {
  useEffect(() => {
    const root = document.documentElement;

    const measure = () => {
      root.style.setProperty("--app-floor-w", `${window.innerWidth}px`);
      root.style.setProperty("--app-floor-h", `${window.innerHeight}px`);
    };

    // Browser zoom changes devicePixelRatio; resizing a window does not. That
    // is the only reliable way to tell the two apart, and it's the whole point:
    // a zoom must keep the floor, a real resize must re-measure it.
    let dpr = window.devicePixelRatio;

    const onResize = () => {
      if (window.devicePixelRatio !== dpr) {
        dpr = window.devicePixelRatio;
        return;
      }
      measure();
    };

    measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return null;
}
