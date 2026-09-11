import Navbar from "./Navbar";
import ViewportFloor from "./ViewportFloor";

// The app shell. Deliberately does no auth work at all.
//
// It used to call auth.protect() and fetch /api/me here, which gated the
// whole group behind a signed-in account with completed onboarding. The
// Games schedule, standings, sponsors and team pages are now public — you
// shouldn't need an account to find out where Scunts starts — so the gate
// moved to the two places that actually need it: /cs-comp, and the exec
// controls inside the schedule.
//
// Keeping this file free of request-time APIs (cookies, headers, auth) is
// also what lets the pages under it prerender. A single auth() call here
// would opt *every* route in the group back into per-request rendering,
// however static its own content is. Signed-in vs signed-out UI is decided
// in the browser instead — see Navbar's <Show> blocks.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // --app-vvh is the measured phone viewport height ViewportFloor publishes;
  // TeamView's own height rule reads the same variable, so the shell can't end
  // up taller than the page content and leave a strip of its own background
  // showing below. 100svh is the pre-JS fallback: svh (not vh) because 100vh
  // includes the strip behind a mobile browser's collapsible URL bar. On
  // desktop the variable is unset and svh/dvh/vh are all identical, so this
  // resolves to exactly what it always was.
  return (
    <div className="min-h-[min(var(--app-vvh,100svh),100svh)] bg-sched-frame-page">
      {/* The only width clamp is the zoom floor ViewportFloor publishes: the
          shell may grow past the load-time viewport width but never shrink
          below it, so zooming in magnifies the layout and scrolls instead of
          rewrapping the nav and crushing the page. The 0px fallback keeps the
          class inert during SSR and first paint. Deliberately no max-width —
          zooming out should expand to fill. */}
      <div className="mx-auto min-h-[min(var(--app-vvh,100svh),100svh)] w-full overflow-hidden bg-sched-bg lg:min-w-[var(--app-floor-w,0px)]">
        <ViewportFloor />
        <Navbar />
        {children}
      </div>
    </div>
  );
}
