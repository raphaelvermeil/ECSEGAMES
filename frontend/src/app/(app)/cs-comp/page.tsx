import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { API_TIMEOUT_MS, API_URL } from "@/lib/api";
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

  // A backend hiccup (or a timeout) is treated the same as an incomplete
  // profile: send them to onboarding, which is where they'd end up anyway,
  // rather than throwing during render with no error boundary to catch it.
  const meRes = await fetch(`${API_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  }).catch(() => null);
  if (!meRes || !meRes.ok) {
    redirect("/select-team?next=/cs-comp");
  }

  const user = await meRes.json();
  if (!user.team || !user.name || !user.major) {
    redirect("/select-team?next=/cs-comp");
  }

  // CsCompView loads its own state from /api/cscomp/me, which carries the
  // same user plus the comp sub-team, claims and submissions. The fetch
  // above stays because it is the onboarding gate, not the comp's data.
  return <CsCompView />;
}
