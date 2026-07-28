import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  await auth.protect();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">ECSESS Games</h1>
      <p className="text-gray-500">You&apos;re in. More coming soon.</p>
    </main>
  );
}
