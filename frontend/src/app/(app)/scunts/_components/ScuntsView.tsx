"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import PageBanner from "@/components/PageBanner";
import MissionList from "./MissionList";
import { Check, Trash } from "@/components/icons";
import { TEAM_COLORS } from "@/lib/leaderboard";
import { TEAMS, teamLabel, type Team } from "@/lib/scores";
import {
  acceptSubmission,
  deleteSubmission,
  listSections,
  listSubmissions,
  listTasks,
  missionCodes,
  type ScuntsSubmission,
  type ScuntsTask,
} from "@/lib/scunts";

const sectionHeadingClass =
  "font-mono text-[11px] uppercase tracking-[0.18em] text-sched-text-muted";

// The filter value for the exec review queue, alongside "all" and the teams.
const PENDING = "pending";

export default function ScuntsView({ canManage }: { canManage: boolean }) {
  const { getToken } = useAuth();
  const [items, setItems] = useState<ScuntsSubmission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // "all", one of the four Games teams, or (execs only) the pending queue.
  // Filtering happens here rather than on the server: the list is capped at
  // 200 anyway, so refetching per tab would cost a round trip and a fresh
  // set of presigned URLs to show pictures the browser already has.
  const [teamFilter, setTeamFilter] = useState<Team | "all" | typeof PENDING>(
    "all",
  );
  // Which half of the page is showing. Missions first: proof is submitted
  // from a mission, so the checklist is where people start.
  const [tab, setTab] = useState<"missions" | "submissions">("missions");
  // Mission text and number for each submission's taskId. Numbers are
  // positions within a section, so they're computed from the live list.
  const [tasks, setTasks] = useState<Map<string, ScuntsTask>>(new Map());
  const [codes, setCodes] = useState<Map<string, string>>(new Map());

  const load = useCallback(
    async () => listSubmissions(await getToken()),
    [getToken],
  );

  useEffect(() => {
    if (tab !== "submissions") return;
    let cancelled = false;
    (async () => {
      try {
        const data = await load();
        if (!cancelled) setItems(data);
      } catch {
        if (!cancelled) setError("Could not load submissions.");
      }
      // Labels are a nicety: an exec without a team can't list missions,
      // and the gallery still works without them.
      try {
        const token = await getToken();
        const [list, sections] = await Promise.all([
          listTasks(token),
          listSections(token),
        ]);
        if (!cancelled) {
          setTasks(new Map(list.map((t) => [t.id, t])));
          setCodes(missionCodes(list, sections));
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [load, getToken, tab]);

  async function onAccept(id: string) {
    try {
      await acceptSubmission(await getToken(), id);
      setItems(await load());
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response
        ?.status;
      setError(
        status === 409
          ? "Already handled: that team has this mission, it was reviewed, or the mission was deleted."
          : "Could not accept that submission.",
      );
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Remove this submission for everyone?")) return;
    try {
      await deleteSubmission(await getToken(), id);
      setItems((prev) => prev?.filter((s) => s.id !== id) ?? null);
    } catch {
      setError("Could not remove that submission.");
    }
  }

  // For execs, pending proof lives only under its own filter so the team
  // tabs show what's actually been accepted. Students only receive their
  // own team's pending proof, which stays inline with a badge.
  const isPending = (s: ScuntsSubmission) => s.status === "pending";
  const pending = (items ?? []).filter(isPending);
  const reviewed = canManage
    ? (items ?? []).filter((s) => !isPending(s))
    : (items ?? []);

  // Counts come from the unfiltered list so each tab still shows its total
  // while another tab is selected.
  const counts = reviewed.reduce<Record<string, number>>((acc, s) => {
    acc[s.team] = (acc[s.team] ?? 0) + 1;
    return acc;
  }, {});
  const shown =
    items === null
      ? null
      : teamFilter === PENDING
        ? pending
        : teamFilter === "all"
          ? reviewed
          : reviewed.filter((s) => s.team === teamFilter);

  return (
    <>
      <PageBanner title="Scunts" subtitle="Post your proof." />

      <main className="min-h-screen bg-sched-bg px-4 pb-16 pt-6 lg:px-10 lg:pb-11 lg:pt-[26px]">
        <div className="mt-6 flex gap-2 lg:mt-8">
          {(
            [
              ["missions", "Missions"],
              ["submissions", "Proof"],
            ] as const
          ).map(([value, label]) => {
            const active = tab === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                aria-pressed={active}
                className={`border px-[14px] py-[8px] font-mono text-[11px] font-medium uppercase tracking-[0.1em] transition-colors ${
                  active
                    ? "border-sched-accent text-sched-accent"
                    : "border-sched-hair text-sched-text-muted hover:border-sched-accent-dim"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {tab === "missions" && <MissionList canManage={canManage} />}

        {tab === "submissions" && (
          <section className="mt-8">
            <h2 className={sectionHeadingClass}>Submissions</h2>
            <p className="mt-1.5 font-mono text-[11px] text-sched-text-muted">
              To submit proof, open a mission on the Missions tab.
            </p>

            {error && (
              <p
                className="mt-2 font-mono text-xs text-sched-coral"
                role="alert"
              >
                {error}
              </p>
            )}

            {/* Team tabs. Each carries its own colour so the filter row reads
              as the same palette as the tiles and the leaderboard. */}
            {items !== null && items.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ...(canManage
                    ? [
                        {
                          value: PENDING as typeof PENDING,
                          label: "New submissions",
                          color: "var(--color-sched-coral)",
                        },
                      ]
                    : []),
                  { value: "all" as const, label: "All", color: undefined },
                  ...TEAMS.map((t) => ({
                    value: t.value,
                    label: t.label,
                    color: TEAM_COLORS[t.value],
                  })),
                ].map((tab) => {
                  const active = teamFilter === tab.value;
                  const n =
                    tab.value === PENDING
                      ? pending.length
                      : tab.value === "all"
                        ? reviewed.length
                        : (counts[tab.value] ?? 0);
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setTeamFilter(tab.value)}
                      aria-pressed={active}
                      className="border px-[12px] py-[7px] font-mono text-[11px] font-medium uppercase tracking-[0.08em] transition-colors"
                      style={{
                        borderColor: active
                          ? (tab.color ?? "var(--color-sched-accent)")
                          : "var(--color-sched-hair)",
                        color: active
                          ? (tab.color ?? "var(--color-sched-accent)")
                          : "var(--color-sched-text-muted)",
                      }}
                    >
                      {tab.label} {n}
                    </button>
                  );
                })}
              </div>
            )}

            {shown === null ? (
              <p className="mt-3 font-mono text-xs text-sched-text-muted">
                Loading…
              </p>
            ) : items !== null && items.length === 0 ? (
              <p className="mt-3 font-mono text-xs text-sched-text-muted">
                Nothing submitted yet. Be the first.
              </p>
            ) : shown.length === 0 ? (
              <p className="mt-3 font-mono text-xs text-sched-text-muted">
                {teamFilter === PENDING
                  ? "No new submissions to review."
                  : "Nothing from this team yet."}
              </p>
            ) : (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((s) => {
                  const task = s.taskId ? tasks.get(s.taskId) : undefined;
                  const code = s.taskId ? codes.get(s.taskId) : undefined;
                  return (
                    <li
                      key={s.id}
                      className="overflow-hidden rounded-sm border border-sched-hair bg-sched-bg-raised"
                      // Same team palette the leaderboard uses, so a team reads
                      // as one colour everywhere in the app.
                      style={{
                        borderLeft: `3px solid ${TEAM_COLORS[s.team as Team]}`,
                      }}
                    >
                      {s.kind === "video" ? (
                        // preload="metadata" so opening the page doesn't pull
                        // down every clip; playsinline so iOS plays it in the
                        // grid instead of taking over the screen.
                        <video
                          src={s.photoUrl}
                          controls
                          playsInline
                          preload="metadata"
                          className="aspect-square w-full bg-black object-cover"
                        />
                      ) : (
                        // Plain <img>: these are presigned URLs on a storage
                        // host, which next/image would need configured up front
                        // and would try to re-optimise for no gain.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.photoUrl}
                          alt={task?.text ?? s.caption}
                          loading="lazy"
                          className="aspect-square w-full object-cover"
                        />
                      )}

                      <div className="p-3">
                        {isPending(s) && (
                          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-sched-coral">
                            Awaiting review
                          </p>
                        )}
                        {s.taskId && (
                          <p className="font-mono text-[13px] leading-snug text-sched-cream">
                            <span className="mr-2 font-semibold text-sched-accent">
                              {code ?? "?"}
                            </span>
                            {task?.text ?? "Mission no longer on the list"}
                          </p>
                        )}
                        {s.caption && (
                          <p
                            className={`text-sm leading-snug ${
                              s.taskId
                                ? "mt-1.5 text-sched-text-muted"
                                : "text-sched-cream"
                            }`}
                          >
                            {s.caption}
                          </p>
                        )}
                        <p className="mt-1.5 font-mono text-[11px] text-sched-text-muted">
                          <span style={{ color: TEAM_COLORS[s.team as Team] }}>
                            {teamLabel(s.team as Team)}
                          </span>{" "}
                          · {s.submittedByName}
                          {s.status === "accepted" && s.points
                            ? ` · +${s.points} pts`
                            : ""}
                        </p>
                        {canManage && (
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {isPending(s) && (
                              <button
                                type="button"
                                onClick={() => onAccept(s.id)}
                                className="inline-flex items-center gap-1.5 bg-sched-accent px-[10px] py-[6px] font-mono text-[11px] font-semibold tracking-[0.06em] text-sched-fill transition-[filter] hover:brightness-[1.12]"
                              >
                                <Check width={13} height={13} strokeWidth={3} />
                                Accept
                                {task ? ` · ${task.points} pts` : ""}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onDelete(s.id)}
                              className="inline-flex items-center gap-1.5 border border-sched-coral px-[10px] py-[6px] font-mono text-[11px] font-medium tracking-[0.06em] text-sched-coral transition-colors hover:bg-sched-coral hover:text-sched-bg"
                            >
                              <Trash width={13} height={13} strokeWidth={2} />
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </main>
    </>
  );
}
