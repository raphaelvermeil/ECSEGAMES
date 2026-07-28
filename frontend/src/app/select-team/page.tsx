import { auth } from "@clerk/nextjs/server";
import SelectTeamForm from "./SelectTeamForm";

export default async function SelectTeamPage() {
  await auth.protect();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Join your team</h1>
        <p className="text-gray-500">
          Pick your program. This choice is locked once you make it.
        </p>
      </div>
      <SelectTeamForm />
    </main>
  );
}
