"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import api from "@/lib/api";

const TEAMS = [
  { slug: "electrical", label: "Electrical" },
  { slug: "computer", label: "Computer" },
  { slug: "software", label: "Software" },
];

export default function SelectTeamForm() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function join(team: string) {
    setSubmitting(team);
    setError(null);
    try {
      const token = await getToken();
      await api.post(
        "/api/team",
        { team },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      router.push("/calendar");
      router.refresh();
    } catch (err) {
      const status =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 409) {
        // Already joined a team — nothing to change, go to the dashboard.
        router.push("/calendar");
        router.refresh();
        return;
      }
      setError("Could not join team. Please try again.");
      setSubmitting(null);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TEAMS.map((t) => (
          <button
            key={t.slug}
            onClick={() => join(t.slug)}
            disabled={submitting !== null}
            className="rounded-lg border border-black/10 px-8 py-6 text-lg font-semibold transition hover:border-black/40 disabled:opacity-50"
          >
            {t.label}
          </button>
        ))}
      </div>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
