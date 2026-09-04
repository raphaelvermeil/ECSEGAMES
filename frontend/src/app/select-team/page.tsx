import { auth } from "@clerk/nextjs/server";
import SelectTeamForm from "./SelectTeamForm";

export default async function SelectTeamPage() {
  await auth.protect();
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
      <SelectTeamForm />
    </main>
  );
}
