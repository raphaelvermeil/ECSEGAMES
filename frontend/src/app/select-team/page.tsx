import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import SelectTeamForm from "./SelectTeamForm";

export default async function SelectTeamPage() {
  await auth.protect();
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-9 p-12"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <Image
          src="/logo.png"
          alt="ECSESS"
          width={160}
          height={40}
          className="h-10 w-auto"
          priority
        />
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
