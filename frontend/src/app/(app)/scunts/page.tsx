import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { API_TIMEOUT_MS, API_URL } from "@/lib/api";
import ScuntsView from "./_components/ScuntsView";

// Members only, and onboarding-complete: a submission is attributed to a
// Games team and to a person by name, so there has to be both. The same
// gate cs-comp applies, for the same reason — and it sends people back here
// afterwards rather than dumping them on the schedule.
export default async function ScuntsPage() {
  await auth.protect();

  const { getToken } = await auth();
  const token = await getToken();

  // A backend hiccup is treated as an incomplete profile, matching cs-comp:
  // onboarding is where they would end up anyway, and it beats throwing
  // during render with no error boundary to catch it.
  const meRes = await fetch(`${API_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  }).catch(() => null);
  if (!meRes || !meRes.ok) {
    redirect("/select-team?next=/scunts");
  }

  const user = await meRes.json();
  if (!user.team || !user.name || !user.major) {
    redirect("/select-team?next=/scunts");
  }

  // The view loads the gallery itself from the browser: presigned URLs
  // expire, so fetching them during render would hand the client links that
  // are already ageing, and the list changes as people submit.
  return (
    <ScuntsView canManage={user.role === "exec" || user.role === "admin"} />
  );
}
