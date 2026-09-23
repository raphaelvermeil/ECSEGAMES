"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, UserButton, useAuth } from "@clerk/nextjs";
import { NAV_LINKS } from "@/lib/nav";

// Desktop only — every page renders its own mobile header (ScheduleBanner
// for /schedule, PageBanner elsewhere) with its own logo/bell/account
// row and hamburger menu, so this bar would just duplicate that below lg.
export default function Navbar() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  // Signed-in only tabs (CS comp, Leaderboard) are hidden signed out rather
  // than shown and then bounced to sign-in. While Clerk is still resolving
  // show the public set — erring that way means a tab appears, never one
  // that flashes and vanishes.
  const links =
    isLoaded && isSignedIn ? NAV_LINKS : NAV_LINKS.filter((l) => l.public);

  return (
    <header className="hidden h-[72px] items-center gap-[30px] bg-sched-chrome px-[22px] font-mono lg:flex">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-sched-accent-dim font-mono text-[10px] font-semibold tracking-[0.05em] text-sched-accent-dim">
          ECSE
        </div>
        <span className="font-display text-[21px] font-semibold tracking-[0.2em] text-sched-cream">
          GAMES
        </span>
      </Link>
      <nav className="flex items-center gap-2">
        {links.map((l) => {
          const active = l.exact
            ? pathname === l.href
            : pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              // Every tab is a dynamic route, and Next only *partially*
              // prefetches those by default (layout down to the loading
              // boundary). prefetch fetches the whole thing, which is what
              // puts it in the 5-minute client cache configured by
              // staleTimes.static — so a tab that has been in view costs no
              // network at all when you click it.
              prefetch
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap border px-[14px] py-[9px] text-sm font-medium text-sched-accent transition-colors ${
                active
                  ? "border-sched-accent shadow-[0_3px_0_0_var(--color-sched-accent)]"
                  : "border-transparent hover:border-sched-accent-dim"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      <div className="flex items-center gap-[18px]">
        {/* Signing in is now opt-in rather than a wall in front of the app,
            so this corner is where it happens. <Show> decides in the browser
            from Clerk's client state — no server auth call, which is what
            keeps the static routes in this group prerenderable. It renders
            null while Clerk boots, hence the fixed-height wrapper: without
            it the nav bar would jolt as the buttons pop in. */}
        <div className="flex h-9 items-center gap-2">
          <Show when="signed-in">
            <UserButton />
          </Show>
          {/* Plain links to the auth pages rather than Clerk's modal: the
              modal ignores the pages' appearance config and renders in
              Clerk's default white theme, so it looked like a different
              product. The pages carry the brand theme (see AuthShell). */}
          <Show when="signed-out">
            <Link
              href="/sign-in"
              className="whitespace-nowrap border border-sched-accent px-[14px] py-[7px] text-sm font-semibold text-sched-accent transition-colors hover:border-sched-cream hover:text-sched-cream"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="whitespace-nowrap border border-sched-accent bg-sched-accent px-[14px] py-[7px] text-sm font-semibold text-sched-bg! transition-colors hover:border-sched-cream hover:bg-sched-cream"
            >
              Sign up
            </Link>
          </Show>
        </div>
      </div>
    </header>
  );
}
