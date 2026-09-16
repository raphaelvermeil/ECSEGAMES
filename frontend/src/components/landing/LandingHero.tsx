import Link from "next/link";
import { ArrowRight } from "@/components/icons";

// PLACEHOLDER COPY — swap the strings below for the real event details.
const EVENT_DATES = "25 – 27 September 2026";
const TAGLINE =
  "Three days. Four teams. One trophy that has been fought over since before any of us got here.";

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-sched-band px-5 pb-14 pt-12 lg:px-10 lg:pb-24 lg:pt-20">
      {/* Same scanline treatment as the app's page banners, so the public
          front door reads as the same product as the interior. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.28]"
        style={{
          background:
            "repeating-linear-gradient(to bottom, rgba(0,0,0,.5) 0 1px, transparent 1px 3px)",
        }}
      />

      <div className="relative mx-auto max-w-4xl">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-sched-accent">
          {EVENT_DATES}
        </p>
        <h1 className="mt-4 font-display text-[54px] font-semibold leading-[0.95] tracking-[0.01em] text-sched-cream lg:text-[104px]">
          ECSE GAMES
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-sched-text lg:text-lg">
          {TAGLINE}
        </p>

        {/* text-sched-bg! is important on purpose: globals.css styles bare
            `a` unlayered, and an unlayered rule outranks Tailwind's layered
            utilities at any specificity. Without the bang the label renders
            in the global link green instead of dark-on-accent. */}
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-sched-accent px-6 py-3 font-mono text-sm uppercase tracking-[0.14em] text-sched-bg! transition-opacity hover:opacity-90"
          >
            Join the Games
            <ArrowRight width={16} height={16} strokeWidth={2} />
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-sm border border-sched-hair px-6 py-3 font-mono text-sm uppercase tracking-[0.14em] text-sched-text transition-colors hover:border-sched-accent-dim hover:text-sched-cream"
          >
            I already have an account
          </Link>
        </div>
      </div>
    </section>
  );
}
