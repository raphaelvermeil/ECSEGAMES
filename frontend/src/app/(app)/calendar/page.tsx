import { auth } from "@clerk/nextjs/server";

export default async function CalendarPage() {
  await auth.protect();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Calendar</h1>
      <p className="mt-2 text-gray-500">
        Placeholder — competitions, meals, administration, and custom events
        will show here.
      </p>
    </main>
  );
}
