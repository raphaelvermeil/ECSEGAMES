"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Zap, Cpu, CodeXml, Users } from "@/components/icons";
import type { Team } from "@/lib/scores";

const TEAMS = [
  { slug: "electrical", label: "Electrical", sub: "U0–U4 · EE", Icon: Zap },
  { slug: "computer", label: "Computer", sub: "U0–U4 · CE", Icon: Cpu },
  { slug: "software", label: "Software", sub: "U0–U4 · SE", Icon: CodeXml },
  { slug: "oldPatrol", label: "Old Patrol", sub: "Alumni", Icon: Users },
];

const inputClass =
  "w-full rounded-lg border border-ecsess-700 bg-ecsess-800 px-4 py-3 text-ecsess-50 placeholder:text-ecsess-400 outline-none transition-colors focus:border-ecsess-400";

export default function SelectTeamForm() {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const [name, setName] = useState("");
  const [major, setMajor] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A team already on file (assigned before name/major existed, or from a
  // submission that failed partway) means the picker is redundant — and
  // resubmitting a *different* team than what's on file would 409 and drop
  // the name/major just typed. So once we know a team exists, the flow
  // becomes "finish your profile" against that same team, not "pick again".
  // undefined = still checking; null = confirmed no team yet.
  const [existingTeam, setExistingTeam] = useState<Team | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;
    async function checkExisting() {
      try {
        const token = await getToken();
        const res = await api.get<{ team: Team | null }>("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setExistingTeam(res.data.team ?? null);
      } catch {
        if (!cancelled) setExistingTeam(null);
      }
    }
    checkExisting();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const profileComplete = name.trim() !== "" && major.trim() !== "";

  async function join(team: string) {
    if (!profileComplete) return;
    const email = clerkUser?.primaryEmailAddress?.emailAddress ?? "";
    setSubmitting(team);
    setError(null);
    try {
      const token = await getToken();
      await api.post(
        "/api/team",
        { team, name: name.trim(), major: major.trim(), email },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      router.push("/schedule");
      router.refresh();
    } catch (err) {
      const status =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 409) {
        router.push("/schedule");
        router.refresh();
        return;
      }
      setError("Could not save. Please try again.");
      setSubmitting(null);
    }
  }

  const profileFields = (
    <div className="grid w-full max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label
          htmlFor="full-name"
          className="mb-2 block text-sm font-medium text-ecsess-300"
        >
          Your name
        </label>
        <input
          id="full-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ada Lovelace"
          autoComplete="name"
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="major"
          className="mb-2 block text-sm font-medium text-ecsess-300"
        >
          Your major
        </label>
        <input
          id="major"
          type="text"
          value={major}
          onChange={(e) => setMajor(e.target.value)}
          placeholder="e.g. U4 Software Eng"
          className={inputClass}
        />
      </div>
    </div>
  );

  // A team is already on file: just finish the profile against it, no
  // picker (changing teams isn't something this screen does).
  if (existingTeam) {
    return (
      <div className="flex flex-col items-center gap-6">
        {profileFields}
        <button
          onClick={() => join(existingTeam)}
          disabled={!profileComplete || submitting !== null}
          className="rounded-lg bg-ecsess-600 px-8 py-3 text-lg font-bold text-ecsess-50 transition-colors hover:bg-ecsess-700 disabled:opacity-50"
        >
          Save and continue
        </button>
        {error && <p className="text-ecsess-200">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {profileFields}

      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {TEAMS.map((t) => (
          <button
            key={t.slug}
            onClick={() => join(t.slug)}
            disabled={!profileComplete || submitting !== null}
            className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg border border-ecsess-700 bg-ecsess-800 px-3 py-3
              transition-colors hover:border-ecsess-400 hover:bg-ecsess-750 disabled:opacity-50
              sm:aspect-auto sm:w-60 sm:gap-4 sm:rounded-xl sm:px-6 sm:py-8"
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ecsess-700 text-ecsess-100 sm:h-14 sm:w-14">
              <t.Icon className="h-4 w-4 sm:h-[26px] sm:w-[26px]" />
            </span>
            <span className="flex flex-col items-center">
              <span className="text-sm font-bold text-ecsess-50 sm:text-2xl">
                {t.label}
              </span>
              <span className="text-[11px] text-ecsess-300 sm:text-sm">
                {t.sub}
              </span>
            </span>
          </button>
        ))}
      </div>
      {!profileComplete && (
        <p className="text-sm text-ecsess-300">
          Fill in your name and major to unlock team selection.
        </p>
      )}
      {error && <p className="text-ecsess-200">{error}</p>}
    </div>
  );
}
