"use client";

import { useEffect } from "react";

// Must match the @custom-variant lg query in globals.css exactly — that's
// what decides phone vs desktop layout everywhere else.
const DESKTOP_QUERY = "(min-width: 64rem), (hover: hover) and (pointer: fine)";

// Publishes two viewport measurements as CSS custom properties.
//
// --app-floor-w / --app-floor-h: the zoom floor. The desktop shell can grow
// past the load-time viewport but never shrink below it, so zooming in
// magnifies the layout and scrolls instead of rewrapping the nav and crushing
// the page. Browser zoom changes window.devicePixelRatio; resizing a window
// does not — that's the only reliable way to tell the two apart, so a zoom
// keeps the floor and a real resize re-measures it.
//
// --app-vvh: the phone layout's exact height. Every height rule in the shell
// and in TeamView reads this one value, so they cannot disagree and leave a
// strip of shell background showing below the content.
//
// Measured from documentElement.clientHeight, which is the only one of the
// three candidates that is the actual usable layout height:
//   - visualViewport.height shrinks under pinch-zoom/page-scale while the
//     rest of the layout doesn't (this is what left a black strip below the
//     content), and
//   - window.innerHeight includes scrollbar space, and balloons outright when
//     a mobile browser zooms out to fit over-wide content (measured 3376 vs a
//     true 844), which would make the page far too tall.
// Floored, so a fractional measurement can't round up into a 1px overflow.
// Consumers additionally clamp with CSS min(…, 100svh) so this can never
// exceed the URL-bar-visible viewport no matter what it reports. Unset on
// desktop so consumers fall back to 100svh.
export default function ViewportFloor() {
  useEffect(() => {
    const root = document.documentElement;
    const mql = window.matchMedia(DESKTOP_QUERY);

    const measureFloor = () => {
      root.style.setProperty("--app-floor-w", `${window.innerWidth}px`);
      root.style.setProperty("--app-floor-h", `${window.innerHeight}px`);
    };

    const measureViewportHeight = () => {
      if (mql.matches) {
        root.style.removeProperty("--app-vvh");
        return;
      }
      root.style.setProperty("--app-vvh", `${Math.floor(root.clientHeight)}px`);
    };

    let dpr = window.devicePixelRatio;

    const onResize = () => {
      // The phone height must track every resize, including the one a mobile
      // browser fires when its URL bar collapses.
      measureViewportHeight();
      if (window.devicePixelRatio !== dpr) {
        dpr = window.devicePixelRatio;
        return; // a zoom: keep the floor
      }
      measureFloor();
    };

    measureFloor();
    measureViewportHeight();
    mql.addEventListener("change", measureViewportHeight);
    window.addEventListener("resize", onResize);
    return () => {
      mql.removeEventListener("change", measureViewportHeight);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return null;
}
