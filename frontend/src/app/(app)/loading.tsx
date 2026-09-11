import MobileChromeBar from "@/components/MobileChromeBar";

// Shown while any (app) route renders on the server. One file for the whole
// group rather than one per route: it nests inside (app)/layout.tsx, so the
// desktop Navbar and ViewportFloor stay mounted and interactive across every
// transition and only the page area swaps.
//
// This file is also what makes navigation feel instant at all. Every route
// here is dynamic (the shared layout reads request headers for auth), and
// Next skips prefetching dynamic routes entirely unless a loading boundary
// exists — so without this, clicking a tab left the previous page on screen,
// with no feedback, until the server came back.
//
// The shape deliberately follows /schedule: it is the slowest tab and the
// one where this will actually be seen.
export default function AppLoading() {
  return (
    <>
      {/* Mobile only. The desktop Navbar lives in the layout and survives the
          transition, but on a phone the top chrome belongs to each *page*
          (MobilePageBanner, ScheduleBanner, CsCompBanner, TeamBanner) and
          unmounts with the outgoing one — so without a stand-in here the
          header disappears mid-navigation. The logo row is static, so it is
          rendered for real; only the title below is a placeholder. */}
      <MobileChromeBar />

      <div className="relative bg-sched-band px-5 pb-4 pt-5 lg:hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.28]"
          style={{
            background:
              "repeating-linear-gradient(to bottom, rgba(0,0,0,.5) 0 1px, transparent 1px 3px)",
          }}
        />
        <div className="relative animate-pulse">
          <div className="h-[40px] w-52 bg-sched-hair" />
          <div className="mt-[9px] h-3 w-32 bg-sched-row-line" />
        </div>
      </div>

      {/* The layout's inner wrapper is already bg-sched-bg, so this stays
          transparent and matches the frame on every route. */}
      <div
        className="animate-pulse px-5 pb-11 pt-6 lg:px-10 lg:pt-9"
        aria-hidden="true"
      >
        <div className="hidden lg:block">
          <div className="h-9 w-64 bg-sched-hair" />
          <div className="mt-3 h-4 w-80 bg-sched-row-line" />
        </div>

        <div className="mt-6 flex gap-2 lg:mt-8">
          <div className="h-8 w-24 border border-sched-hair" />
          <div className="h-8 w-24 border border-sched-hair" />
          <div className="h-8 w-24 border border-sched-hair" />
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <div className="h-20 border border-sched-hair bg-sched-bg-raised" />
          <div className="h-20 border border-sched-hair bg-sched-bg-raised" />
          <div className="h-20 border border-sched-hair bg-sched-bg-raised" />
          <div className="h-20 border border-sched-hair bg-sched-bg-raised" />
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading…
      </span>
    </>
  );
}
