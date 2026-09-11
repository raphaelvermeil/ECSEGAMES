import api from "@/lib/api";
import { EMPTY_LEADERBOARD, type Leaderboard } from "@/lib/leaderboard";
import LeaderboardView from "./_components/LeaderboardView";

// Standings are live, so this must render per request rather than being
// baked in at build time. Nothing else on this page forces that any more:
// the page no longer touches auth (the leaderboard endpoint is public), so
// without this Next would happily prerender the build-time standings and
// serve them to everyone until the next deploy.
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  // Seeded server-side so the standings are on screen in the first paint;
  // the view polls on from there. The fetch lives here rather than in
  // lib/leaderboard.ts because that module is also imported by the client
  // view. No auth header — GET /api/leaderboard is public, so a signed-out
  // visitor sees the same standings as anyone else. Falls back to empty when
  // the backend is unreachable so the page still renders, matching
  // listEvents().
  let initial: Leaderboard = EMPTY_LEADERBOARD;
  try {
    const res = await api.get<Leaderboard>("/api/leaderboard");
    initial = res.data;
  } catch {
    initial = EMPTY_LEADERBOARD;
  }

  return <LeaderboardView initial={initial} />;
}
