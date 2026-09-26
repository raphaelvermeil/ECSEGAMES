import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { API_TIMEOUT_MS, API_URL } from "@/lib/api";
import { EMPTY_LEADERBOARD, type Leaderboard } from "@/lib/leaderboard";
import LeaderboardView from "./_components/LeaderboardView";

// Standings are live, so this must render per request rather than being
// baked in at build time. auth.protect() below already forces that, but the
// flag stays explicit so the page keeps rendering live if the gate ever
// moves again.
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  // Execs only. Standings are held back from students while the Games run,
  // so this is a role gate rather than the plain signed-in check the rest of
  // the group uses. /api/leaderboard is gated to match — the page check
  // alone would leave the numbers readable straight from the API.
  await auth.protect();

  const { getToken } = await auth();
  const token = await getToken();

  const meRes = await fetch(`${API_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  }).catch(() => null);
  const role = meRes?.ok ? (await meRes.json()).role : null;
  if (role !== "exec" && role !== "admin") {
    // Not an error page: a student following an old link belongs on the
    // schedule, and a backend hiccup lands them there too rather than on a
    // leaderboard that would fail to load anyway.
    redirect("/schedule");
  }

  // Seeded server-side so the standings are on screen in the first paint;
  // the view polls on from there. Carries the token now that the endpoint is
  // exec-gated. Falls back to empty when the backend is unreachable so the
  // page still renders, matching listEvents().
  let initial: Leaderboard = EMPTY_LEADERBOARD;
  try {
    const res = await fetch(`${API_URL}/api/leaderboard`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    if (res.ok) initial = await res.json();
  } catch {
    initial = EMPTY_LEADERBOARD;
  }

  return <LeaderboardView initial={initial} />;
}
