import Link from "next/link";

// PLACEHOLDER — real URLs go in FOOTER_LINKS and SOCIALS when available.
const FOOTER_LINKS = [
  { label: "ECSESS", href: "#" },
  { label: "Contact", href: "#" },
  { label: "Code of conduct", href: "#" },
  { label: "Accessibility", href: "#" },
];

const SOCIALS = [
  { label: "Instagram", href: "#" },
  { label: "Discord", href: "#" },
  { label: "Facebook", href: "#" },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-sched-hair bg-sched-chrome px-5 py-10 lg:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 sm:flex-row sm:justify-between">
        <div>
          <span className="font-display text-[15px] font-semibold tracking-[0.2em] text-sched-cream">
            ECSE GAMES
          </span>
          <p className="mt-2 max-w-xs text-sm text-sched-text-muted">
            Run by the ECSE Student Society at McGill University.
          </p>
        </div>

        <div className="flex gap-12">
          <ul className="space-y-2">
            {FOOTER_LINKS.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="font-mono text-xs uppercase tracking-[0.12em] text-sched-text-muted transition-colors hover:text-sched-cream"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="space-y-2">
            {SOCIALS.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="font-mono text-xs uppercase tracking-[0.12em] text-sched-text-muted transition-colors hover:text-sched-cream"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-5xl font-mono text-[11px] text-sched-text-muted">
        © 2026 ECSESS. Placeholder footer content.
      </p>
    </footer>
  );
}
