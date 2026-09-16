"use client";

import { Menu, X } from "@/components/icons";
import AccountControl from "@/components/AccountControl";

// The phone-sized top bar: ECSE mark, bell, account control, hamburger.
//
// The desktop Navbar is `hidden lg:flex` and lives once in (app)/layout.tsx.
// Below lg it disappears, and each page draws its own header — so this is
// the mobile counterpart to Navbar, and like Navbar there is exactly one of
// it. Every page banner (ScheduleBanner, MobilePageBanner, CsCompBanner,
// TeamBanner) renders this and then adds its own title block underneath.
// Previously each of those inlined its own copy; five copies drifted apart
// and had to be fixed five times.
//
// Sticky so the status bar always sits on solid chrome: the layout runs
// edge to edge under it, and a header that scrolled away would leave the
// clock on top of whatever content was passing beneath. On a page that
// doesn't scroll (meet-the-team is a fixed, non-scrolling layout) sticky is
// simply inert. It only works at all because the shell's overflow clip is
// desktop-only — see (app)/layout.tsx.
//
// z-65 puts it above the event sheet's backdrop (z-60) rather than under it.
// That is deliberate and is what keeps the top edge of the page a constant
// --color-sched-chrome: iOS Safari only tints its address bar from
// theme-color when the reader has Website Tinting switched on, so relying on
// that to match a dimmed header was never dependable. #1a1c1a happens to sit
// within a shade of Safari's own default dark chrome, so leaving this bar
// undimmed makes the seam disappear either way. The full-screen event form
// (z-70) and the nav drawer (z-80) still layer over it — the drawer by
// opening beneath it, see MobileNavMenu.
//
// The top padding is the safe-area inset and nothing else — no design
// padding is added to it. Where the browser's own chrome already sits above
// the page (iOS Safari with the address bar at the top) the inset is 0, so
// the bar starts flush at the logo instead of adding a second gap under
// Safari's, which read as a lopsided header. Where the page really does run
// under the notch (address bar at the bottom) the inset is the full ~59px
// and the logo clears it. The 12px below is unconditional, so there is
// still a little breathing room against the band underneath.
//
// Height is therefore --app-chrome-h (56px: 44px of controls + 12px below)
// plus the inset. The schedule's day-tab row pins directly beneath this and
// offsets itself by exactly that sum, so changing the padding here means
// changing --app-chrome-h in globals.css to match.
export default function MobileChromeBar({
  menuOpen = false,
  onToggleMenu,
}: {
  // Whether the nav drawer is showing. The bar stays visible above it, so
  // this button is the drawer's only close control — it becomes an ✕ rather
  // than the drawer carrying a second one of its own.
  menuOpen?: boolean;
  // Omitted by the loading skeleton, which has no drawer to toggle and
  // renders the icon as a non-interactive placeholder.
  onToggleMenu?: () => void;
}) {
  const MenuIcon = menuOpen ? X : Menu;
  return (
    <div className="sticky top-0 z-[65] flex flex-none items-center justify-between gap-3 bg-sched-chrome px-4 pb-3 pt-[var(--app-safe-top)] lg:hidden">
      <div className="flex items-center gap-[9px]">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-sched-accent-dim font-mono text-[10px] font-semibold tracking-[0.05em] text-sched-accent-dim">
          ECSE
        </div>
        <span className="font-display text-[15px] font-semibold tracking-[0.2em] text-sched-cream">
          GAMES
        </span>
      </div>
      <div className="flex items-center gap-[6px]">
        <AccountControl />
        {onToggleMenu ? (
          <button
            type="button"
            onClick={onToggleMenu}
            aria-expanded={menuOpen}
            aria-label={
              menuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            className="flex h-11 w-11 items-center justify-center text-sched-text-muted"
          >
            <MenuIcon width={22} height={22} strokeWidth={1.8} />
          </button>
        ) : (
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center text-sched-text-muted"
          >
            <MenuIcon width={22} height={22} strokeWidth={1.8} />
          </span>
        )}
      </div>
    </div>
  );
}
