import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CodeXml,
  Trophy,
  Zap,
} from "@/components/icons";
import { TEAM_COLORS } from "@/lib/leaderboard";
import { TEAMS } from "@/lib/scores";
import SignedOutOnly from "./SignedOutOnly";

// Copy lives in plain arrays and strings at the top of the file, so editing
// what the page says never means touching markup.

const ABOUT_BODY = [
  "The ECSE Games are the ECSE Student Society's competition weekend, running for the first time this year: three days of events that range from genuinely athletic to entirely ridiculous, run by execs and fought over by four teams drawn from across the department.",
  "Everyone is welcome regardless of year, program stream, or how competitive you actually are. Most events have a seated or low-effort alternative, and nothing requires drinking to take part.",
];

const HIGHLIGHTS = [
  {
    title: "Scunts",
    blurb:
      "A weekend-long set of challenges. Tasks drop Friday morning and stay open until closing ceremonies.",
    icon: Zap,
  },
  {
    title: "Captains Challenge",
    blurb:
      "Captains only. A short relay of mental and physical tasks that sets the tone and the first points of the weekend.",
    icon: Trophy,
  },
  {
    title: "CS comp",
    blurb:
      "A set of timed challenges that put your frontend knowledge to the test, plus a round of cybersecurity questions.",
    icon: CodeXml,
  },
  {
    title: "BOAT Races",
    blurb:
      "Opening night. The weekend kicks off with the whole department in one room.",
    icon: CalendarDays,
  },
];

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sched-accent">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-display text-3xl font-semibold tracking-[0.01em] text-sched-cream lg:text-4xl">
        {title}
      </h2>
    </>
  );
}

export default function LandingSections() {
  return (
    <>
      <section className="border-t border-sched-hair bg-sched-bg px-5 py-14 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-4xl">
          <SectionHeading
            eyebrow="The event"
            title="What are the ECSE Games?"
          />
          {ABOUT_BODY.map((p) => (
            <p
              key={p.slice(0, 24)}
              className="mt-4 text-base leading-relaxed text-sched-text"
            >
              {p}
            </p>
          ))}
        </div>
      </section>

      <section className="border-t border-sched-hair bg-sched-bg-raised px-5 py-14 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-5xl">
          <SectionHeading eyebrow="Pick a side" title="The four teams" />
          {/* Colours come from the leaderboard's validated team palette, so a
              team reads as the same colour here as it does on its chart line. */}
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {TEAMS.map(({ value, label }) => (
              <li
                key={value}
                className="rounded-sm border border-sched-hair bg-sched-bg p-5"
                style={{ borderLeft: `3px solid ${TEAM_COLORS[value]}` }}
              >
                <h3
                  className="font-display text-xl tracking-wide"
                  style={{ color: TEAM_COLORS[value] }}
                >
                  {label}
                </h3>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-sched-hair bg-sched-bg px-5 py-14 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-5xl">
          <SectionHeading eyebrow="What happens" title="Event highlights" />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {HIGHLIGHTS.map(({ title, blurb, icon: Icon }) => (
              <li
                key={title}
                className="rounded-sm border border-sched-hair bg-sched-bg-raised p-5"
              >
                <span className="flex items-center gap-2.5 text-sched-accent">
                  <Icon width={18} height={18} strokeWidth={1.8} />
                  <h3 className="font-display text-lg tracking-wide text-sched-cream">
                    {title}
                  </h3>
                </span>
                <p className="mt-2 text-sm leading-relaxed text-sched-text-muted">
                  {blurb}
                </p>
              </li>
            ))}
          </ul>
          <Link
            href="/schedule"
            className="mt-7 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-sched-accent transition-colors hover:text-sched-cream"
          >
            See the full three-day schedule
            <ArrowRight width={14} height={14} strokeWidth={2} />
          </Link>
        </div>
      </section>

      <SignedOutOnly>
        <section className="border-t border-sched-hair bg-sched-band px-5 py-14 text-center lg:px-10 lg:py-20">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-semibold text-sched-cream lg:text-4xl">
              Ready to play?
            </h2>
            <p className="mt-3 text-base text-sched-text">
              Sign up with your McGill email and pick your team.
            </p>
            <Link
              href="/sign-up"
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-sm bg-sched-accent px-6 py-3 font-mono text-sm uppercase tracking-[0.14em] text-sched-bg! transition-opacity hover:opacity-90"
            >
              Create an account
              <ArrowRight width={16} height={16} strokeWidth={2} />
            </Link>
          </div>
        </section>
      </SignedOutOnly>
    </>
  );
}
