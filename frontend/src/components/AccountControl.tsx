"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";

// The account slot in the mobile page banners: the Clerk avatar once you're
// signed in, a compact "Sign in" otherwise.
//
// It exists because the pages these banners sit on — schedule, leaderboard,
// sponsors, meet-the-team, home — are public now, so the avatar can't be
// assumed. Register isn't offered here: the sign-in modal links to it, and
// the phone header has no room for two buttons beside the bell and the
// hamburger. The desktop Navbar has space and shows both.
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
        <SignInButton mode="modal">
          <button
            type="button"
            className="whitespace-nowrap border border-sched-accent-dim px-[10px] py-[6px] font-mono text-[11px] font-medium text-sched-accent"
          >
            Sign in
          </button>
        </SignInButton>
      </Show>
    </span>
  );
}
