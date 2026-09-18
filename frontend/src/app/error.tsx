"use client";

import Link from "next/link";
import { useEffect } from "react";

// Catches a render-time throw anywhere under the root layout, so a backend
// hiccup shows this instead of Next's bare default screen. Must be a client
// component (Next's error boundary contract).
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-sched-bg px-6 text-center font-mono">
      <p className="text-[10px] tracking-[0.18em] text-sched-text-muted">
        SOMETHING WENT WRONG
      </p>
      <h1 className="font-display text-3xl font-semibold text-sched-cream">
        That page didn&apos;t load.
      </h1>
      <p className="max-w-md text-sm text-sched-text-muted">
        Probably a hiccup talking to the server. Try again, or head back to the
        schedule.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="border border-sched-accent bg-sched-accent px-5 py-[11px] text-xs font-semibold tracking-[0.1em] text-sched-bg"
        >
          TRY AGAIN
        </button>
        <Link
          href="/schedule"
          className="border border-sched-hair px-5 py-[11px] text-xs tracking-[0.1em] text-sched-text"
        >
          SCHEDULE
        </Link>
      </div>
    </main>
  );
}
