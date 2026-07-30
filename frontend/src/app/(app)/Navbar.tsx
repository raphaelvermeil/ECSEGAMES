"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const LINKS = [
  { href: "/calendar", label: "Calendar" },
  { href: "/events", label: "Events" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between border-b border-black/10 px-6 py-3">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-semibold">
          ECSESS Games
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active ? "font-semibold" : "text-gray-500 hover:text-gray-900"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <UserButton />
    </header>
  );
}
