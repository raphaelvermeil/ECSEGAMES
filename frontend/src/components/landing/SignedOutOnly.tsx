"use client";

import { Show } from "@clerk/nextjs";

// Client-side "signed out only" gate for the landing page's sign-in/sign-up
// invitations. Imported from a server component, Clerk's <Show> resolves
// through auth() and would opt / into per-request rendering; behind this
// "use client" boundary it decides from Clerk's browser state instead, the
// same way the Navbar does, so the page stays prerendered. Renders nothing
// while Clerk boots, so a signed-in visitor never sees the invites flash.
export default function SignedOutOnly({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Show when="signed-out">{children}</Show>;
}
