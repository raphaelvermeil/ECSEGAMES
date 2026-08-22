"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Bell } from "@/components/icons";
import { NAV_LINKS } from "@/lib/nav";

// Desktop only — every page renders its own mobile header (ScheduleBanner
// for /schedule, MobilePageBanner elsewhere) with its own logo/bell/account
// row and hamburger menu, so this bar would just duplicate that below lg.
export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="hidden h-[72px] items-center gap-[30px] bg-sched-chrome px-[22px] font-mono lg:flex">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-sched-accent-dim font-mono text-[10px] font-semibold tracking-[0.05em] text-sched-accent-dim">
          ECSE
        </div>
        <span className="font-display text-[21px] font-semibold tracking-[0.2em] text-sched-cream">
          GAMES
        </span>
      </Link>
      <nav className="flex items-center gap-2">
        {NAV_LINKS.map((l) => {
          const active = l.exact
            ? pathname === l.href
            : pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`border px-[14px] py-[9px] text-sm font-medium text-sched-accent transition-colors ${
                active
                  ? "border-sched-accent shadow-[0_3px_0_0_var(--color-sched-accent)]"
                  : "border-transparent hover:border-sched-accent-dim"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      <div className="flex items-center gap-[18px]">
        <Bell
          width={22}
          height={22}
          strokeWidth={1.6}
          className="text-sched-accent"
        />
        <UserButton />
      </div>
    </header>
  );
}
