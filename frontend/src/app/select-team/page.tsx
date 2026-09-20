import { auth } from "@clerk/nextjs/server";
import SelectTeamForm from "./SelectTeamForm";

// ?next= is where to go once the team is saved — the CS comp gate sets it
// so a student who was sent here mid-way lands back on the comp, not on
// the schedule. Only a same-site path is honoured; the form applies the
// default otherwise.
export default async function SelectTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await auth.protect();
  const { next } = await searchParams;
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-9 p-12"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full border border-ecsess-400 font-mono text-xs font-semibold tracking-[0.05em] text-ecsess-150">
            ECSE
          </div>
          <span className="font-display text-3xl font-semibold tracking-[0.2em] text-ecsess-50">
            GAMES
          </span>
        </div>
        <h1 className="mt-2 text-5xl font-extrabold tracking-tight text-ecsess-50">
          Join your team
        </h1>
        <p className="text-lg text-ecsess-200">
          Pick your program. This choice is{" "}
          <span className="font-semibold text-ecsess-150">locked</span> once you
          make it.
        </p>
      </div>
      <SelectTeamForm next={next} />
    </main>
  );
}
