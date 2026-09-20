"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab and Shift+Tab inside a dialog while it is open, and moves focus
 * into it on open so keyboard and screen-reader users land in the overlay
 * rather than on whatever is behind it. The panel should have tabIndex={-1}
 * so it can take that initial focus; a Tab from there goes to its first
 * control.
 *
 * Only visible controls count: a panel that renders desktop and mobile
 * variants of a row has one of them display:none, and .focus() on a hidden
 * element is a silent no-op that would let focus escape.
 */
export function useFocusTrap(
  panelRef: RefObject<HTMLElement | null>,
  active = true,
) {
  useEffect(() => {
    if (!active) return;
    const panel = panelRef.current;
    if (!panel) return;

    const trigger = document.activeElement as HTMLElement | null;
    panel.focus({ preventScroll: true });

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || !panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetWidth || el.offsetHeight);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && (current === first || current === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || current === panel)) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus?.({ preventScroll: true });
    };
  }, [panelRef, active]);
}

// Shared behaviour for the full-screen overlays — the event sheet, the event
// form, the mobile nav drawer. Both hooks are no-ops when `active` is false,
// so a component that stays mounted while closed can call them unconditionally.

/**
 * Freezes the page behind an overlay.
 *
 * `overflow: hidden` on the body is enough for a wheel or trackpad, but iOS
 * Safari ignores it for touch — which is where this actually bites: with an
 * event sheet open you could still drag the schedule around underneath it,
 * and a flick that started on the dimmed backdrop scrolled the page rather
 * than doing nothing. Pinning the body with `position: fixed` at its current
 * offset is what holds on iOS.
 *
 * The offset has to be restored by hand on the way out: a fixed body reports
 * scrollY 0, so without the scrollTo on cleanup, closing a sheet would dump
 * you back at the top of the schedule instead of where you were reading.
 */
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;

    const { body } = document;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}

/**
 * Re-tints the browser's own chrome while an overlay is open.
 *
 * The root layout declares a static theme-color matching the header
 * (--color-sched-chrome), which iOS Safari paints its address bar with. When
 * an overlay dims or replaces the page the top of the *content* changes
 * shade, and the address bar keeps the old one — so the seam that
 * viewport-fit=cover was meant to remove reappears the moment you tap an
 * event. Pointing this at whatever the overlay actually puts against the top
 * edge keeps them matched, and the previous value is restored on close.
 *
 * Pass null to leave the tag alone.
 */
export function useThemeColor(color: string | null) {
  useEffect(() => {
    if (!color) return;

    // Two things are going on here.
    //
    // Rewriting the existing tag's content is not enough: Chrome re-reads it,
    // iOS Safari does not, so the address bar kept the header colour from
    // page load while the content behind it went dark — the exact mismatch
    // this hook exists to remove. Inserting a node is what makes Safari pick
    // the value up.
    //
    // And it is *prepended* rather than replacing the layout's tag, because
    // browsers honour the first theme-color in tree order. That leaves the
    // tag Next renders completely untouched, so reverting is just removing
    // this one — no need to remember a previous value and restore it. The
    // earlier version did remember one, and navigating from an open nav
    // drawer stranded the tint on the drawer's green: the component unmounts
    // mid-navigation, and from then on every open captured that green as its
    // "previous" and restored to it forever.
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = color;
    document.head.prepend(meta);

    return () => meta.remove();
  }, [color]);
}
