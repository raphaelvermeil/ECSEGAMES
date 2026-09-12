import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import CsCompView from "./_components/CsCompView";

// The one page in the group that still requires an account. Competing means
// joining a sub-team, claiming parts and submitting code, all of which are
// written against a real user — so this is where the gate the shared layout
// used to apply now lives.
//
// The onboarding check moved here too. It used to run in (app)/layout.tsx
// and bounce every signed-in user with an incomplete profile off every page;
// now that the rest of the app is public, an incomplete profile only blocks
// the thing that actually needs a name and a team.
export default async function CsCompPage() {
  await auth.protect();

  const { getToken } = await auth();
  const token = await getToken();

  const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  // Previously this did meRes.json() unguarded, so a backend hiccup threw
  // during render with no error boundary to catch it. Treat anything other
  // than a clean response as "profile not confirmed" and send them to
  // onboarding, which is where they'd end up anyway.
  if (!meRes.ok) {
    redirect("/select-team");
  }

  const user = await meRes.json();
  if (!user.team || !user.name || !user.major) {
    redirect("/select-team");
  }

  // CsCompView loads its own state from /api/cscomp/me, which carries the
  // same user plus the comp sub-team, claims and submissions. The fetch
  // above stays because it is the onboarding gate, not the comp's data.
  return <CsCompView />;
}
