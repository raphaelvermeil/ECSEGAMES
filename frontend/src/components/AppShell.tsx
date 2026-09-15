import Navbar from "@/components/Navbar";
import ViewportFloor from "@/components/ViewportFloor";

// The app chrome — frame, zoom floor, nav — shared by the authenticated
// (app) group and the public one. It lives here rather than being written
// out in each layout so the two can't drift apart visually; the layouts
// differ only in what they gate, not in what they look like.
//
// signedIn is resolved by each layout and passed down: Navbar uses it to
// decide between the full link set plus UserButton and the public link set
// plus a sign-in button.
export default function AppShell({
  signedIn,
  children,
}: {
  signedIn: boolean;
  children: React.ReactNode;
}) {
  return (
    // --app-vvh is the measured phone viewport height ViewportFloor
    // publishes; TeamView's own height rule reads the same variable, so the
    // shell can't end up taller than the page content and leave a strip of
    // its own background showing below. 100svh is the pre-JS fallback: svh
    // (not vh) because 100vh includes the strip behind a mobile browser's
    // collapsible URL bar. On desktop the variable is unset and svh/dvh/vh
    // are all identical, so this resolves to exactly what it always was.
    <div className="min-h-[min(var(--app-vvh,100svh),100svh)] bg-sched-frame-page">
      {/* The only width clamp is the zoom floor ViewportFloor publishes: the
          shell may grow past the load-time viewport width but never shrink
          below it, so zooming in magnifies the layout and scrolls instead of
          rewrapping the nav and crushing the page. The 0px fallback keeps the
          class inert during SSR and first paint. Deliberately no max-width —
          zooming out should expand to fill. */}
      <div className="mx-auto min-h-[min(var(--app-vvh,100svh),100svh)] w-full overflow-hidden bg-sched-bg lg:min-w-[var(--app-floor-w,0px)]">
        <ViewportFloor />
        <Navbar signedIn={signedIn} />
        {children}
      </div>
    </div>
  );
}
