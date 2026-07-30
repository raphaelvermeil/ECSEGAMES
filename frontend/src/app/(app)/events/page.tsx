import { auth } from "@clerk/nextjs/server";

export default async function EventsPage() {
  await auth.protect();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Events</h1>
      <p className="mt-2 text-gray-500">
        Placeholder — the list of events. Execs will open an event to award
        points to teams here.
      </p>
    </main>
  );
}
