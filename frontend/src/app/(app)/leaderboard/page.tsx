import { auth } from "@clerk/nextjs/server";
import api from "@/lib/api";
import { EMPTY_LEADERBOARD, type Leaderboard } from "@/lib/leaderboard";
import LeaderboardView from "./_components/LeaderboardView";

// Standings are live, so this must render per request rather than being
// baked in at build time. auth.protect() below already forces that, but the
// flag stays explicit so the page keeps rendering live if the gate ever
// moves again.
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  // Members only: signed-out visitors are sent to sign-in, the same gate
  // cs-comp uses. The backend endpoint itself stays public — the page is
  // the gate, as everywhere else in this group.
  await auth.protect();

  // Seeded server-side so the standings are on screen in the first paint;
  // the view polls on from there. The fetch lives here rather than in
  // lib/leaderboard.ts because that module is also imported by the client
  // view. No auth header — GET /api/leaderboard is public. Falls back to
  // empty when the backend is unreachable so the page still renders,
  // matching listEvents().
  let initial: Leaderboard = EMPTY_LEADERBOARD;
  try {
    const res = await api.get<Leaderboard>("/api/leaderboard");
    initial = res.data;
  } catch {
    initial = EMPTY_LEADERBOARD;
  }

  return <LeaderboardView initial={initial} />;
}
