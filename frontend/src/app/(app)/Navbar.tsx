"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { NavLink } from "@/components/ui";
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
    <header className="flex h-[66px] items-center justify-between bg-ecsess-black px-7">
      <div className="flex items-center gap-9">
        <Link href="/" className="flex items-center gap-3">
          {/* Drop the ECSESS wordmark PNG in /public/logo.png */}
          <Image
            src="/logo.png"
            alt="ECSESS"
            width={120}
            height={30}
            className="h-[30px] w-auto"
            priority
          />
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-ecsess-300">
            Games
          </span>
        </Link>
        <nav className="flex items-center">
          {LINKS.map((l) => {
            const active = l.exact
              ? pathname === l.href
              : pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <NavLink key={l.href} href={l.href} active={active}>
                {l.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <Bell className="text-ecsess-300" width={20} height={20} />
        <UserButton />
      </div>
    </header>
  );
}
