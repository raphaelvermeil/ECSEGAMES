import { auth } from "@clerk/nextjs/server";

export default async function Dashboard() {
  await auth.protect();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-gray-500">
        Placeholder — competitions, puzzles, and standings will live here.
      </p>
    </main>
  );
}
