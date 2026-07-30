import { auth } from "@clerk/nextjs/server";

export default async function SchedulePage() {
  await auth.protect();
  return (
    <main className="bg-ecsess-900 px-10 pb-11 pt-9">
      <h1 className="text-4xl font-extrabold text-ecsess-50">Schedule</h1>
      <p className="mt-1.5 text-base text-ecsess-300">Coming soon.</p>
    </main>
  );
}
