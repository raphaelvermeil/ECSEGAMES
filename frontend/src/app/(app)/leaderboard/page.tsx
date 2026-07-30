import { auth } from "@clerk/nextjs/server";

export default async function LeaderboardPage() {
  await auth.protect();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Leaderboard</h1>
      <p className="mt-2 text-gray-500">
        Placeholder — program, sub-team, and individual standings will show
        here.
      </p>
    </main>
  );
}
