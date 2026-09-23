// The footer carries the wordmark and who runs the Games, nothing more.
// The link and social columns were dropped rather than left pointing at "#":
// a dead link reads as a broken site, whereas their absence reads as a
// deliberately small footer. Add them back when there are real URLs.
export default function LandingFooter() {
  return (
    <footer className="border-t border-sched-hair bg-sched-chrome px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <span className="font-display text-[15px] font-semibold tracking-[0.2em] text-sched-cream">
          ECSE GAMES
        </span>
        <p className="mt-2 max-w-xs text-sm text-sched-text-muted">
          Run by the ECSE Student Society at McGill University.
        </p>
        <p className="mt-10 font-mono text-[11px] text-sched-text-muted">
          © 2026 ECSESS
        </p>
      </div>
    </footer>
  );
}
