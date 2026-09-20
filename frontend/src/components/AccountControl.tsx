"use client";

import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";

// The account slot in the mobile page banners: the Clerk avatar once you're
// signed in, a compact "Sign in" otherwise.
//
// It exists because the pages these banners sit on — schedule, leaderboard,
// meet-the-team, home — are public now, so the avatar can't be
// assumed. Sign in only: this row is already tight with the logo and the
// hamburger, and the drawer beside it carries Sign up. It links to the
// sign-in page rather than opening Clerk's modal, which ignores the page
// theme and renders white.
//
// <Show> renders null while Clerk boots, so the fixed h-11 keeps the header
// row from jumping when the avatar or button appears.
export default function AccountControl() {
  return (
    <span className="flex h-11 items-center">
      <Show when="signed-in">
        <UserButton />
      </Show>
      <Show when="signed-out">
        <Link
          href="/sign-in"
          className="whitespace-nowrap border border-sched-accent-dim px-[10px] py-[6px] font-mono text-[11px] font-medium text-sched-accent"
        >
          Sign in
        </Link>
      </Show>
    </span>
  );
}
