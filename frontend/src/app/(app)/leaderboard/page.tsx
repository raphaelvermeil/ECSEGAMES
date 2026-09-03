import { auth } from "@clerk/nextjs/server";
import api from "@/lib/api";
import { EMPTY_LEADERBOARD, type Leaderboard } from "@/lib/leaderboard";
import LeaderboardView from "./_components/LeaderboardView";

export default async function LeaderboardPage() {
  await auth.protect();

  // Seeded server-side so the standings are on screen in the first paint;
  // the view polls on from there. The fetch lives here rather than in
  // lib/leaderboard.ts because that module is also imported by the client
  // view — pulling @clerk/nextjs/server into it would drag server-only
  // code into the browser bundle. Falls back to empty when the backend is
  // unreachable so the page still renders, matching listEvents().
  let initial: Leaderboard = EMPTY_LEADERBOARD;
  try {
    const { getToken } = await auth();
    const token = await getToken();
    const res = await api.get<Leaderboard>("/api/leaderboard", {
      headers: { Authorization: `Bearer ${token}` },
    });
    initial = res.data;
  } catch {
    initial = EMPTY_LEADERBOARD;
  }

  return <LeaderboardView initial={initial} />;
}
