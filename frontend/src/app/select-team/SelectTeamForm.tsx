"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import api from "@/lib/api";
import { Zap, Cpu, CodeXml } from "@/components/icons";

const TEAMS = [
  { slug: "electrical", label: "Electrical", sub: "U1–U3 · EE", Icon: Zap },
  { slug: "computer", label: "Computer", sub: "U1–U3 · CE", Icon: Cpu },
  { slug: "software", label: "Software", sub: "U1–U3 · SE", Icon: CodeXml },
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
      setError("Could not join team. Please try again.");
      setSubmitting(null);
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {TEAMS.map((t) => (
          <button
            key={t.slug}
            onClick={() => join(t.slug)}
            disabled={submitting !== null}
            className="flex w-60 flex-col items-center gap-4 rounded-xl border border-ecsess-700 bg-ecsess-800 px-6 py-8
              transition-colors hover:border-ecsess-400 hover:bg-ecsess-750 disabled:opacity-50"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ecsess-700 text-ecsess-100">
              <t.Icon width={26} height={26} />
            </span>
            <span className="text-2xl font-bold text-ecsess-50">{t.label}</span>
            <span className="text-sm text-ecsess-300">{t.sub}</span>
          </button>
        ))}
      </div>
      {error && <p className="text-ecsess-200">{error}</p>}
    </div>
  );
}
