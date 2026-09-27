"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import PageBanner from "@/components/PageBanner";
import MissionList from "./MissionList";
import DeadlineBar from "./DeadlineBar";
import { Check, ChevronRight, Trash } from "@/components/icons";
import { TEAM_COLORS } from "@/lib/leaderboard";
import { TEAMS, teamLabel, type Team } from "@/lib/scores";
import {
  acceptSubmission,
  deleteSubmission,
  getSettings,
  listSections,
  listSubmissions,
  listTasks,
  MAX_COMMENT_LEN,
  missionCodes,
  peakSubmission,
  rejectSubmission,
  unpeakSubmission,
  setClosesAt,
  type ScuntsSettings,
  type ScuntsSubmission,
  type ScuntsTask,
} from "@/lib/scunts";

const sectionHeadingClass =
  "font-mono text-[11px] uppercase tracking-[0.18em] text-sched-text-muted";

const inputClass =
  "box-border w-full border border-sched-hair bg-sched-bg px-[12px] py-[11px] font-mono text-sm text-sched-cream placeholder:text-[#5d7063] [color-scheme:dark] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sched-accent";

// Filter values for the exec review queue, the caller's own proof and peak
// proof, alongside "all" and the teams.
const PENDING = "pending";
const MINE = "mine";
const PEAK = "peak";
const PEAK_COLOR = "#ff8a1f";

export default function ScuntsView({ canManage }: { canManage: boolean }) {
  const { getToken } = useAuth();
  const [items, setItems] = useState<ScuntsSubmission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // "all", one of the four Games teams, or (execs only) the pending queue.
  // Filtering happens here rather than on the server: the list is capped at
  // 1000 anyway, so refetching per tab would cost a round trip and a fresh
  // set of presigned URLs to show pictures the browser already has.
  const [teamFilter, setTeamFilter] = useState<
    Team | "all" | typeof PENDING | typeof MINE | typeof PEAK
  >("all");
  const [query, setQuery] = useState("");
  // The submission an exec is writing a rejection comment for.
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  // Which half of the page is showing. Missions first: proof is submitted
  // from a mission, so the checklist is where people start.
  const [tab, setTab] = useState<"missions" | "submissions">("missions");
  // Mission text and number for each submission's taskId. Numbers are
  // positions within a section, so they're computed from the live list.
  const [tasks, setTasks] = useState<Map<string, ScuntsTask>>(new Map());
  const [codes, setCodes] = useState<Map<string, string>>(new Map());

  // When submissions close, and the current moment to compare it against.
  // Refetched on a slow tick so an exec's change reaches open pages, and so
  // the page flips to closed on time without a reload.
  const [settings, setSettings] = useState<ScuntsSettings | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const data = await getSettings(await getToken());
        if (!cancelled) setSettings(data);
      } catch {}
      if (!cancelled) setNow(Date.now());
    };
    refresh();
    const tick = setInterval(refresh, 30_000);
    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, [getToken]);
  const closed =
    !!settings?.closesAt && now >= new Date(settings.closesAt).getTime();

  async function onSetClose(at: Date | null) {
    try {
      setSettings(await setClosesAt(await getToken(), at));
      setNow(Date.now());
    } catch {
      setError("Could not change when submissions close.");
    }
  }

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

  async function onPeak(id: string) {
    try {
      await peakSubmission(await getToken(), id);
      setItems(await load());
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response
        ?.status;
      setError(
        status === 409
          ? "Already handled: that proof is already peak, was reviewed, or the mission was deleted."
          : "Could not mark that submission as peak.",
      );
    }
  }

  async function onUnpeak(id: string) {
    if (!confirm("Remove peak and its bonus points?")) return;
    try {
      await unpeakSubmission(await getToken(), id);
      setItems(await load());
    } catch {
      setError("Could not remove peak from that submission.");
    }
  }

  async function onReject(id: string) {
    try {
      await rejectSubmission(await getToken(), id, comment);
      setRejectingId(null);
      setComment("");
      setItems(await load());
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response
        ?.status;
      setError(
        status === 409
          ? "Already handled: that submission was reviewed or removed."
          : "Could not reject that submission.",
      );
    }
  }

  async function onDelete(s: ScuntsSubmission) {
    const prompt = canManage
      ? "Remove this submission for everyone?"
      : isPending(s)
        ? "Cancel this submission?"
        : "Remove this submission?";
    if (!confirm(prompt)) return;
    try {
      await deleteSubmission(await getToken(), s.id);
      setItems((prev) => prev?.filter((x) => x.id !== s.id) ?? null);
    } catch {
      setError("Could not remove that submission.");
    }
  }

  // Pending and rejected proof live only under their own tabs, so the team
  // tabs show what's actually been accepted. Execs review pending proof
  // under "New submissions"; everyone sees their own under "My
  // submissions", with the exec's comment on anything rejected.
  const isPending = (s: ScuntsSubmission) => s.status === "pending";
  const isRejected = (s: ScuntsSubmission) => s.status === "rejected";
  const pending = (items ?? []).filter(isPending);
  const mine = (items ?? []).filter((s) => s.mine);
  const reviewed = (items ?? []).filter((s) => !isPending(s) && !isRejected(s));

  // Counts come from the unfiltered list so each tab still shows its total
  // while another tab is selected.
  const counts = reviewed.reduce<Record<string, number>>((acc, s) => {
    acc[s.team] = (acc[s.team] ?? 0) + 1;
    return acc;
  }, {});
  const tabbed =
    teamFilter === PENDING
      ? pending
      : teamFilter === MINE
        ? mine
        : teamFilter === PEAK
          ? reviewed.filter((s) => s.peak)
          : teamFilter === "all"
            ? reviewed
            : reviewed.filter((s) => s.team === teamFilter);
  // Like the mission search, but every word typed must match: the mission
  // number (G12), or the start of any word in the mission, caption or
  // submitter's name. So "album cover" finds "Recreate an album cover".
  const q = query.trim().toLowerCase();
  const matches = (s: ScuntsSubmission) => {
    const code = s.taskId ? codes.get(s.taskId)?.toLowerCase() : undefined;
    const words = [
      s.taskId ? tasks.get(s.taskId)?.text : "",
      s.caption,
      s.submittedByName,
    ]
      .join(" ")
      .toLowerCase()
      .split(/\s+/);
    return q
      .split(/\s+/)
      .every(
        (term) =>
          (code?.startsWith(term) ?? false) ||
          words.some((w) => w.startsWith(term)),
      );
  };
  // Peak proof always leads, whichever tab is showing; the sort is stable,
  // so each group stays newest first.
  const shown =
    items === null
      ? null
      : (q ? tabbed.filter(matches) : tabbed).toSorted(
          (a, b) => Number(!!b.peak) - Number(!!a.peak),
        );

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

        <DeadlineBar
          settings={settings}
          closed={closed}
          canManage={canManage}
          onSet={onSetClose}
        />

        {tab === "missions" && (
          <MissionList canManage={canManage} closed={closed} />
        )}

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
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search proof (e.g. G12, a word or a name)"
                className={`${inputClass} mt-4`}
                aria-label="Search proof"
              />
            )}

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
                  {
                    value: MINE as typeof MINE,
                    label: "My submissions",
                    color: undefined,
                  },
                  { value: "all" as const, label: "All", color: undefined },
                  ...TEAMS.map((t) => ({
                    value: t.value,
                    label: t.label,
                    color: TEAM_COLORS[t.value],
                  })),
                  {
                    value: PEAK as typeof PEAK,
                    label: "🔥 Peak",
                    color: PEAK_COLOR,
                  },
                ].map((tab) => {
                  const active = teamFilter === tab.value;
                  const n =
                    tab.value === PENDING
                      ? pending.length
                      : tab.value === MINE
                        ? mine.length
                        : tab.value === PEAK
                          ? reviewed.filter((s) => s.peak).length
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
                {q
                  ? "No proof matches that search."
                  : teamFilter === PENDING
                    ? "No new submissions to review."
                    : teamFilter === MINE
                      ? "You haven't submitted anything yet."
                      : teamFilter === PEAK
                        ? "No peak proof yet."
                        : "Nothing from this team yet."}
              </p>
            ) : (
              // No scroll anchoring: marking proof peak moves its card to the
              // top, and the browser would otherwise scroll up to follow it.
              <ul className="mt-3 grid gap-3 [overflow-anchor:none] sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((s) => {
                  const task = s.taskId ? tasks.get(s.taskId) : undefined;
                  const code = s.taskId ? codes.get(s.taskId) : undefined;
                  return (
                    <li
                      key={s.id}
                      className={`overflow-hidden rounded-sm border bg-sched-bg-raised ${
                        s.peak ? "scunts-peak" : "border-sched-hair"
                      }`}
                      // Same team palette the leaderboard uses, so a team reads
                      // as one colour everywhere in the app.
                      style={{
                        borderLeft: `3px solid ${TEAM_COLORS[s.team as Team]}`,
                      }}
                    >
                      <div className="relative">
                        <ProofMedia
                          submission={s}
                          alt={task?.text ?? s.caption}
                        />
                        {s.peak && (
                          <span className="pointer-events-none scunts-peak-badge absolute left-2 top-2 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em]">
                            🔥 Peak
                          </span>
                        )}
                      </div>

                      <div className="p-3">
                        {isPending(s) && (
                          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-sched-coral">
                            Awaiting review
                          </p>
                        )}
                        {isRejected(s) && (
                          <div className="mb-2 border-l-2 border-sched-coral pl-2">
                            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-sched-coral">
                              Not accepted — submit new proof from Missions
                            </p>
                            {s.reviewComment && (
                              <p className="mt-1 text-sm leading-snug text-sched-cream">
                                {s.reviewComment}
                              </p>
                            )}
                          </div>
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
                        {canManage && rejectingId === s.id && (
                          <div className="mt-2.5 flex flex-col gap-2">
                            <textarea
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              placeholder={
                                isPending(s)
                                  ? "Leave a comment: why isn't this accepted?"
                                  : "Leave a comment: why is this no longer accepted? Its points come off and the mission reopens."
                              }
                              maxLength={MAX_COMMENT_LEN}
                              rows={3}
                              className={inputClass}
                              aria-label="Rejection comment"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => onReject(s.id)}
                                className="border border-sched-coral bg-sched-coral px-[10px] py-[6px] font-mono text-[11px] font-semibold tracking-[0.06em] text-sched-bg"
                              >
                                Send rejection
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingId(null);
                                  setComment("");
                                }}
                                className="border border-sched-hair px-[10px] py-[6px] font-mono text-[11px] tracking-[0.06em] text-sched-text-muted"
                              >
                                Back
                              </button>
                            </div>
                          </div>
                        )}
                        {(canManage ||
                          (s.mine && (isPending(s) || isRejected(s)))) && (
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {canManage &&
                              (isPending(s) || s.status === "accepted") &&
                              rejectingId !== s.id && (
                                <>
                                  {isPending(s) && (
                                    <button
                                      type="button"
                                      onClick={() => onAccept(s.id)}
                                      className="inline-flex items-center gap-1.5 bg-sched-accent px-[10px] py-[6px] font-mono text-[11px] font-semibold tracking-[0.06em] text-sched-fill transition-[filter] hover:brightness-[1.12]"
                                    >
                                      <Check
                                        width={13}
                                        height={13}
                                        strokeWidth={3}
                                      />
                                      Accept
                                      {task ? ` · ${task.points} pts` : ""}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectingId(s.id);
                                      setComment("");
                                    }}
                                    className="inline-flex items-center gap-1.5 border border-sched-coral px-[10px] py-[6px] font-mono text-[11px] font-medium tracking-[0.06em] text-sched-coral transition-colors hover:bg-sched-coral hover:text-sched-bg"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            <button
                              type="button"
                              onClick={() => onDelete(s)}
                              className="inline-flex items-center gap-1.5 border border-sched-coral px-[10px] py-[6px] font-mono text-[11px] font-medium tracking-[0.06em] text-sched-coral transition-colors hover:bg-sched-coral hover:text-sched-bg"
                            >
                              <Trash width={13} height={13} strokeWidth={2} />
                              {!canManage && isPending(s) ? "Cancel" : "Remove"}
                            </button>
                            {canManage &&
                              !s.peak &&
                              (isPending(s) || s.status === "accepted") &&
                              rejectingId !== s.id && (
                                <button
                                  type="button"
                                  onClick={() => onPeak(s.id)}
                                  className="inline-flex items-center gap-1.5 bg-sched-cyan px-[10px] py-[6px] font-mono text-[11px] font-semibold tracking-[0.06em] text-sched-fill transition-[filter] hover:brightness-[1.12]"
                                >
                                  🔥 Peak
                                </button>
                              )}
                            {canManage && s.peak && (
                              <button
                                type="button"
                                onClick={() => onUnpeak(s.id)}
                                className="inline-flex items-center gap-1.5 border border-sched-cyan px-[10px] py-[6px] font-mono text-[11px] font-medium tracking-[0.06em] text-sched-cyan transition-colors hover:bg-sched-cyan hover:text-sched-fill"
                              >
                                Unpeak
                              </button>
                            )}
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

// ProofMedia shows a submission's files one at a time, with arrows to step
// through them when a proof has more than one.
function ProofMedia({
  submission: s,
  alt,
}: {
  submission: ScuntsSubmission;
  alt: string;
}) {
  const media = [s, ...(s.extra ?? [])];
  const [index, setIndex] = useState(0);
  const m = media[index];
  const step = (d: number) =>
    setIndex((index + d + media.length) % media.length);
  const arrowClass =
    "absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-sched-cream transition-colors hover:bg-sched-accent hover:text-sched-fill";

  return (
    <div className="relative">
      {m.kind === "video" ? (
        // preload="metadata" so opening the page doesn't pull down every
        // clip; playsinline so iOS plays it in the grid instead of taking
        // over the screen.
        <video
          key={m.photoUrl}
          src={m.photoUrl}
          controls
          playsInline
          preload="metadata"
          className="aspect-square w-full bg-black object-cover"
        />
      ) : (
        // Plain <img>: these are presigned URLs on a storage host, which
        // next/image would need configured up front and would try to
        // re-optimise for no gain.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={m.photoUrl}
          src={m.photoUrl}
          alt={alt}
          loading="lazy"
          className="aspect-square w-full object-cover"
        />
      )}

      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous"
            className={`${arrowClass} left-2`}
          >
            <ChevronRight
              width={18}
              height={18}
              strokeWidth={2.5}
              className="rotate-180"
            />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next"
            className={`${arrowClass} right-2`}
          >
            <ChevronRight width={18} height={18} strokeWidth={2.5} />
          </button>
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[11px] text-sched-cream">
            {index + 1}/{media.length}
          </span>
        </>
      )}
    </div>
  );
}
