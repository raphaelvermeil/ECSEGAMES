import Link from "next/link";

// A missing route gets the app's own look rather than Next's default page.
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-sched-bg px-6 text-center font-mono">
      <p className="text-[10px] tracking-[0.18em] text-sched-text-muted">404</p>
      <h1 className="font-display text-3xl font-semibold text-sched-cream">
        Nothing here.
      </h1>
      <p className="max-w-md text-sm text-sched-text-muted">
        That page doesn&apos;t exist. The schedule is the best place to start.
      </p>
      <Link
        href="/schedule"
        className="border border-sched-accent bg-sched-accent px-5 py-[11px] text-xs font-semibold tracking-[0.1em] text-sched-bg"
      >
        GO TO THE SCHEDULE
      </Link>
    </main>
  );
}
