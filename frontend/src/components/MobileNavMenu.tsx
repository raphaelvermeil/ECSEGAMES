"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, useAuth, useUser } from "@clerk/nextjs";
import api from "@/lib/api";
import { NAV_LINKS } from "@/lib/nav";
import { useFocusTrap, useScrollLock } from "@/lib/overlay";
import { teamLabel, type Team } from "@/lib/scores";

// Right-side slide-in drawer for mobile nav — the shared Navbar's link row
// is desktop-only (`hidden lg:flex`), so this is the only way to switch
// tabs on a phone. Used both by Navbar itself (every route except Schedule,
// where the shared bar is hidden in favor of ScheduleBanner's own merged
// header) and by ScheduleBanner directly.
export default function MobileNavMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  // null = not fetched yet; "" = fetched, no team on file. Keeping the two
  // apart is what stops a teamless user from re-fetching on every open.
  const [team, setTeam] = useState<Team | "" | null>(null);
  // Same rule as the desktop Navbar: signed-in only tabs are hidden signed
  // out, and the public set is shown while Clerk is still resolving.
  const links =
    isLoaded && isSignedIn ? NAV_LINKS : NAV_LINKS.filter((l) => l.public);

  // Takes `open` because the drawer stays mounted and returns null when shut.
  //
  // No useThemeColor here on purpose. The drawer opens beneath the app header
  // and seals the home-indicator strip with the same colour, so both edges of
  // the screen are already --color-sched-chrome — exactly what the layout
  // declares as the default theme-color. There is nothing left to override.
  useScrollLock(open);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    // Signed-out visitors have no team to show, and /api/me would 401 —
    // so the drawer opens with no network call at all for them.
    if (!open || team !== null || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await api.get<{ team: Team | "" }>("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setTeam(res.data.team ?? "");
      } catch {
        // Footer just omits the team line if this fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, team, user, getToken]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    // Opens *beneath* the app header rather than over it. The header is a
    // constant --color-sched-chrome, which sits within a shade of Safari's
    // own default dark chrome, so leaving the top strip to it makes the seam
    // against the address bar disappear whether or not the reader has Website
    // Tinting switched on. Covering that strip with the drawer's green band
    // was what made the page read as a rectangle cut out between Safari's two
    // bars. Both the backdrop and the panel start at the header's bottom edge.
    <div className="fixed inset-x-0 bottom-0 top-[calc(var(--app-chrome-h)+var(--app-safe-top))] z-[80] lg:hidden">
      <div
        onClick={onClose}
        aria-hidden="true"
        className="animate-sched-fade absolute inset-0 bg-[rgba(4,9,7,.7)]"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="animate-sched-slide absolute inset-y-0 right-0 flex w-[76%] max-w-xs flex-col border-l border-sched-accent-dim bg-sched-bg-raised outline-none"
        // The panel's first 40px start at exactly the header's colour and
        // dissolve into its own, so the drawer phases out of the bar above
        // instead of butting against it with a hard horizontal edge. Written
        // as an explicit two-colour stop rather than fading to `transparent`:
        // transparent is rgba(0,0,0,0), and interpolating towards it drags a
        // muddy grey through the middle of the ramp.
        //
        // bg-sched-bg-raised stays on the element as the paint underneath, so
        // everything past the 40px mark is the flat panel colour.
        style={{
          backgroundImage:
            "linear-gradient(to bottom, var(--color-sched-chrome), var(--color-sched-bg-raised) 40px)",
        }}
      >
        {/* A little air before the first row, so the fade has a clean run
            rather than resolving underneath the Home link's own background. */}
        <nav className="flex-1 overflow-y-auto overscroll-contain pt-2">
          {links.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(link.href + "/");
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                // Same full-route prefetch as the desktop Navbar. The head
                // start here is only as long as it takes to scan the drawer
                // and tap, since these links don't exist until it opens —
                // but that is still a second or so of the round-trip paid
                // up front.
                prefetch
                aria-current={active ? "page" : undefined}
                className="flex items-center gap-[14px] border-l-[3px] px-[18px] py-[14px]"
                style={{
                  borderLeftColor: active
                    ? "var(--color-sched-accent)"
                    : "transparent",
                  background: active ? "rgba(110,231,135,.06)" : "transparent",
                  color: active
                    ? "var(--color-sched-accent)"
                    : "var(--color-sched-text)",
                }}
              >
                <Icon
                  width={20}
                  height={20}
                  strokeWidth={1.8}
                  className="flex-none"
                />
                <span>
                  <span className="block font-mono text-sm font-medium">
                    {link.label}
                  </span>
                  <span className="mt-1 block font-mono text-[11px] leading-[1.5] text-sched-text-muted">
                    {link.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-none px-[18px] pb-[calc(2.5rem+var(--app-safe-bottom))] pt-4 font-mono text-[10px] leading-[1.7] text-sched-text-muted">
          {user ? (
            <>
              Signed in as {user.fullName ?? user.username ?? "you"}
              {team && (
                <>
                  <br />
                  Team {teamLabel(team)}
                </>
              )}
            </>
          ) : (
            // Browsing works signed out; this is only needed to enter the CS
            // comp or to run an event as an exec.
            // Sign in only — Clerk's card already links to sign-up for
            // anyone who doesn't have an account yet.
            <div className="flex flex-col gap-2">
              <span>Sign in to join the CS comp.</span>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="w-full border border-sched-accent bg-sched-accent px-3 py-2 font-mono text-[11px] font-semibold text-sched-bg"
                >
                  Sign in
                </button>
              </SignInButton>
            </div>
          )}
        </div>
      </div>

      {/* Seals the home-indicator strip across the full width — over the
          backdrop as well as the panel — with the same colour as the app
          header, which sits within a shade of Safari's bottom toolbar.
          Sealing only the panel left the quarter of the screen beside it
          still showing dimmed page, which measured #151816 against the
          toolbar instead of matching it. The footer above pads itself by the
          same inset so nothing ends up underneath this. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[var(--app-safe-bottom)] bg-sched-chrome"
      />
    </div>
  );
}
