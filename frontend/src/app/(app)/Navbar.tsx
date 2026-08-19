"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Bell } from "@/components/icons";

const LINKS = [
  { href: "/", label: "Home", exact: true },
  { href: "/schedule", label: "Schedule" },
  { href: "/events", label: "Events" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="flex h-[72px] items-center gap-[30px] bg-sched-chrome px-[22px] font-mono">
      <Link href="/" className="flex items-center gap-3">
        <Image
          src="/logo.png"
          alt="ECSESS"
          width={120}
          height={30}
          className="h-8 w-auto"
          priority
        />
        <span className="font-display text-[21px] font-semibold tracking-[0.2em] text-sched-cream">
          GAMES
        </span>
      </Link>
      <nav className="flex items-center gap-2">
        {LINKS.map((l) => {
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
