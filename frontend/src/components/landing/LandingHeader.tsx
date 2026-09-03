import Link from "next/link";

// Public top bar for the landing page. Deliberately not the app Navbar:
// that one lives inside the (app) layout, which is auth-gated and assumes a
// joined team. Signed-in visitors are redirected away before this renders
// (see app/page.tsx), so there is no signed-in state to handle here.
export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-sched-chrome px-4 py-3 lg:px-10">
      <Link href="/" className="flex items-center gap-[9px]">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-sched-accent-dim font-mono text-[10px] font-semibold tracking-[0.05em] text-sched-accent-dim">
          ECSE
        </span>
        <span className="font-display text-[15px] font-semibold tracking-[0.2em] text-sched-cream">
          GAMES
        </span>
      </Link>

      <nav className="flex items-center gap-2">
        <Link
          href="/sign-in"
          className="px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-sched-text transition-colors hover:text-sched-cream"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-sm border border-sched-accent-dim px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-sched-accent transition-colors hover:bg-sched-accent hover:text-sched-bg"
        >
          Sign up
        </Link>
      </nav>
    </header>
  );
}
