"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import api from "@/lib/api";
import { ChevronRight } from "@/components/icons";
import { TEAMS, type ScoreEntry, type Team } from "@/lib/scores";
import type { EventCategory } from "@/lib/events";
import type { AuditEntry } from "@/lib/history";
import { verbColor } from "@/lib/history";
import { formatFooterTimestamp } from "@/lib/schedule";

const inputClass =
  "box-border border border-sched-hair bg-sched-bg-raised px-[10px] py-[9px] font-mono text-[13px] text-sched-cream placeholder:text-[#5d7063] [color-scheme:dark]";

// Shared by the header and every row so the POINTS column's right edge
// (and the expand-chevron slot after it) stay fixed regardless of a row's
// content — the chevron slot is always reserved, even when empty.
const scoreRowColumns = "1fr 60px 24px";

function pointsText(value: number): string {
  return String(value);
}

function pointsColor(value: number): string {
  if (value > 0) return "var(--color-sched-accent)";
  if (value < 0) return "var(--color-sched-coral)";
  return "var(--color-sched-text-muted)";
}

function errorMessage(err: unknown): string {
  const status =
    typeof err === "object" && err !== null && "response" in err
      ? (err as { response?: { status?: number } }).response?.status
      : undefined;
  if (status === 403) return "You don't have permission to do that.";
  if (status === 409) return "This entry was already cleared.";
  return "Something went wrong. Please try again.";
}

// The entry a team currently holds, or null if the team hasn't been graded
// (never awarded, or its award was cleared). A team has at most one entry
// per event — awarding overwrites it in place rather than adding a row.
function currentEntry(
  team: Team,
  scores: ScoreEntry[] | null,
): ScoreEntry | null {
  const e = scores?.find((s) => s.team === team);
  return e && !e.cleared ? e : null;
}

export default function ScoringPanel({
  eventId,
  category,
}: {
  eventId: string;
  category: EventCategory;
}) {
  const { getToken } = useAuth();
  const [scores, setScores] = useState<ScoreEntry[] | null>(null);
  const [history, setHistory] = useState<AuditEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [expandedTeam, setExpandedTeam] = useState<Team | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const [awardTeam, setAwardTeam] = useState<Team>(TEAMS[0].value);
  const [awardPoints, setAwardPoints] = useState("");
  const [awardDescription, setAwardDescription] = useState("");
  const [awardError, setAwardError] = useState<string | null>(null);
  const [awarding, setAwarding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
        const [scoresRes, historyRes] = await Promise.all([
          api.get<ScoreEntry[]>(`/api/events/${eventId}/scores`, authHeaders),
          api.get<AuditEntry[]>(`/api/events/${eventId}/history`, authHeaders),
        ]);
        if (cancelled) return;
        setScores(scoresRes.data);
        setHistory(historyRes.data);
        const entry = currentEntry(awardTeam, scoresRes.data);
        setAwardPoints(entry ? String(entry.value) : "");
        setAwardDescription(entry ? entry.description : "");
      } catch {
        if (!cancelled) setLoadError("Could not load scores.");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // Only re-runs when the event changes — awardTeam is read for its value
    // at load time, not tracked as a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, getToken]);

  // Best-effort refresh of the history log after an award or clear — the
  // action itself has already succeeded, so a failure here just means the
  // expandable log is briefly stale.
  async function refreshHistory() {
    try {
      const token = await getToken();
      const res = await api.get<AuditEntry[]>(
        `/api/events/${eventId}/history`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setHistory(res.data);
    } catch {
      // ignore
    }
  }

  function selectAwardTeam(team: Team) {
    setAwardTeam(team);
    const entry = currentEntry(team, scores);
    setAwardPoints(entry ? String(entry.value) : "");
    setAwardDescription(entry ? entry.description : "");
    setAwardError(null);
  }

  function openConfirmClear(id: string) {
    setConfirmingId(id);
    setClearError(null);
  }

  async function handleAward() {
    const trimmed = awardPoints.trim();
    const value = Number(trimmed);
    if (trimmed === "" || Number.isNaN(value)) {
      setAwardError("Enter a number of points.");
      return;
    }
    setAwarding(true);
    setAwardError(null);
    try {
      const token = await getToken();
      const res = await api.post<ScoreEntry>(
        `/api/events/${eventId}/scores`,
        { team: awardTeam, value, description: awardDescription },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setScores((prev) => [
        ...(prev ?? []).filter((s) => s.team !== awardTeam),
        res.data,
      ]);
      await refreshHistory();
    } catch (err) {
      setAwardError(errorMessage(err));
    } finally {
      setAwarding(false);
    }
  }

  async function handleClear(id: string, team: Team) {
    setClearing(true);
    setClearError(null);
    try {
      const token = await getToken();
      const res = await api.delete<ScoreEntry>(
        `/api/events/${eventId}/scores/${id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setScores(
        (prev) => prev?.map((s) => (s.id === id ? res.data : s)) ?? prev,
      );
      setConfirmingId(null);
      if (team === awardTeam) {
        setAwardPoints("");
        setAwardDescription("");
      }
      await refreshHistory();
    } catch (err) {
      setClearError(errorMessage(err));
    } finally {
      setClearing(false);
    }
  }

  const isCompetition = category === "Competition";
  const hasVisiblePoints = scores?.some((s) => !s.cleared) ?? false;

  // Non-Competition events only show a panel at all once they've actually
  // been scored (e.g. a Competition event whose category later changed) —
  // and then it's read-only, since scoring an event outside Competition
  // isn't a supported action.
  if (!isCompetition) {
    if (scores === null || loadError) return null;
    if (!hasVisiblePoints) return null;
  }
  const readOnly = !isCompetition;

  const rows = TEAMS.map((t) => {
    const entry = currentEntry(t.value, scores);
    const rawEntry = scores?.find((s) => s.team === t.value) ?? null;
    const rowHistory = rawEntry
      ? (history ?? []).filter(
          (h) => h.entityType === "scoreEntry" && h.entityId === rawEntry.id,
        )
      : [];
    return { team: t.value, label: t.label, entry, rowHistory };
  });

  const formEntry = currentEntry(awardTeam, scores);

  return (
    <div className="border-t border-sched-hair px-5 pb-[26px] pt-[22px] lg:px-[30px]">
      <h3 className="mb-4 font-mono text-[11px] font-medium tracking-[0.18em] text-sched-accent-dim">
        SCORING
      </h3>

      {loadError && (
        <p className="font-mono text-xs text-sched-coral">{loadError}</p>
      )}

      {!loadError && (
        <>
          <div
            className="grid items-center gap-[10px] border-b border-sched-hair pb-[9px] font-mono text-[10px] font-medium tracking-[0.12em] text-sched-text-muted"
            style={{ gridTemplateColumns: scoreRowColumns }}
          >
            <span>RECIPIENT</span>
            <span className="text-right">POINTS</span>
            <span />
          </div>

          {scores === null && (
            <p className="py-4 font-mono text-xs text-sched-text-muted">
              Loading…
            </p>
          )}

          {scores !== null &&
            rows.map(({ team, label, entry, rowHistory }) => {
              const expanded = expandedTeam === team;
              const expandable = rowHistory.length > 0;

              return (
                <div
                  key={team}
                  className="border-b border-[rgba(63,143,87,.18)]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      expandable && setExpandedTeam(expanded ? null : team)
                    }
                    aria-expanded={expandable ? expanded : undefined}
                    disabled={!expandable}
                    className="grid w-full items-center gap-[10px] py-[13px] text-left disabled:cursor-default"
                    style={{
                      gridTemplateColumns: scoreRowColumns,
                      opacity: entry ? 1 : 0.6,
                    }}
                  >
                    <span className="font-mono text-[13px] text-sched-cream">
                      {label}
                    </span>
                    <span
                      className="text-right font-mono text-[17px] font-medium"
                      style={{
                        color: entry
                          ? pointsColor(entry.value)
                          : "var(--color-sched-text-muted)",
                      }}
                    >
                      {entry ? (
                        pointsText(entry.value)
                      ) : (
                        <>
                          {/* A fixed-size bar rather than an em dash — a
                              dash glyph's ink sits inset from its own
                              advance box, so text-right alone left it
                              looking a few px off from the digits above. */}
                          <span
                            aria-hidden="true"
                            className="inline-block h-[2px] w-[10px] bg-current align-middle"
                          />
                          <span className="sr-only">Not graded</span>
                        </>
                      )}
                    </span>
                    <span className="flex h-6 w-6 items-center justify-center text-sched-text-muted">
                      {expandable && (
                        <ChevronRight
                          width={12}
                          height={12}
                          strokeWidth={2}
                          style={{
                            transform: expanded ? "rotate(90deg)" : "none",
                            transition: "transform .15s",
                          }}
                        />
                      )}
                    </span>
                  </button>

                  {expanded && expandable && (
                    <div className="mb-[13px] border border-sched-hair bg-sched-bg px-[14px] py-[12px]">
                      {entry && (
                        <div className="mb-[13px] font-mono text-xs leading-[1.6] text-sched-text">
                          {entry.description}
                          <div className="mt-[5px] font-mono text-[10px] text-sched-text-muted">
                            {formatFooterTimestamp(entry.awardedAt)}
                          </div>
                        </div>
                      )}

                      {!readOnly &&
                        entry &&
                        (confirmingId === entry.id ? (
                          <div className="mb-[13px] flex flex-wrap items-center gap-[10px]">
                            <span className="font-mono text-xs text-sched-coral">
                              Clear {pointsText(entry.value)} points from{" "}
                              {label}?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleClear(entry.id, team)}
                              disabled={clearing}
                              className="border border-sched-coral px-3 py-[6px] font-mono text-[11px] font-medium tracking-[0.08em] text-sched-coral disabled:opacity-60"
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingId(null)}
                              className="px-[2px] py-[6px] font-mono text-[11px] text-sched-text-muted underline"
                            >
                              Cancel
                            </button>
                            {clearError && (
                              <p className="w-full font-mono text-xs text-sched-coral">
                                {clearError}
                              </p>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openConfirmClear(entry.id)}
                            className="mb-[13px] border border-[rgba(255,123,84,.35)] px-3 py-[6px] font-mono text-[11px] text-sched-coral transition-colors hover:border-sched-coral"
                          >
                            Clear
                          </button>
                        ))}

                      <div className="mb-[9px] font-mono text-[10px] font-medium tracking-[0.14em] text-sched-accent-dim">
                        HISTORY
                      </div>
                      {rowHistory.map((h) => (
                        <div
                          key={h.id}
                          className="border-t border-[rgba(63,143,87,.18)] py-[9px] first:border-t-0 first:pt-0"
                        >
                          <span
                            className="font-mono text-[9px] font-medium uppercase tracking-[0.14em]"
                            style={{ color: verbColor(h.verb) }}
                          >
                            {h.verb}
                          </span>
                          <div className="mt-[5px] font-mono text-xs leading-[1.6] text-sched-text">
                            {h.text}
                          </div>
                          {h.diffs?.map((d, i) => (
                            <div
                              key={i}
                              className="mt-[5px] flex flex-wrap items-center gap-[7px] font-mono text-[11px]"
                            >
                              <span className="text-sched-text-muted">
                                {d.label}
                              </span>
                              <span className="text-sched-text-muted line-through">
                                {d.from}
                              </span>
                              <span className="text-sched-accent-dim">
                                -&gt;
                              </span>
                              <span className="text-sched-cream">{d.to}</span>
                            </div>
                          ))}
                          <div className="mt-[5px] font-mono text-[10px] text-sched-text-muted">
                            {h.actor} · {formatFooterTimestamp(h.at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </>
      )}

      {!readOnly && !loadError && (
        <div className="mt-[22px] border border-sched-hair bg-sched-bg p-[18px]">
          <h4 className="mb-[14px] font-mono text-[11px] font-medium tracking-[0.16em] text-sched-text-muted">
            {formEntry ? "UPDATE POINTS" : "AWARD POINTS"}
          </h4>
          <div className="flex flex-col gap-3 lg:gap-[14px]">
            <div>
              <span className="mb-[7px] block font-mono text-[10px] font-medium tracking-[0.12em] text-sched-text-muted">
                RECIPIENT
              </span>
              <div className="flex border border-sched-hair">
                {TEAMS.map((t) => {
                  const active = awardTeam === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => selectAwardTeam(t.value)}
                      className="flex-1 px-1 py-[9px] font-mono text-[11px] font-medium tracking-[0.06em]"
                      style={{
                        background: active
                          ? "var(--color-sched-accent)"
                          : "transparent",
                        color: active
                          ? "var(--color-sched-fill)"
                          : "var(--color-sched-text-muted)",
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-[14px]">
              <div>
                <label
                  htmlFor="award-points"
                  className="mb-[7px] block font-mono text-[10px] font-medium tracking-[0.12em] text-sched-text-muted"
                >
                  POINTS
                </label>
                <input
                  id="award-points"
                  type="number"
                  value={awardPoints}
                  onChange={(e) => setAwardPoints(e.target.value)}
                  placeholder="e.g. 250 or -50"
                  className={`${inputClass} sched-no-spinner w-full`}
                />
              </div>
              <div>
                <label
                  htmlFor="award-desc"
                  className="mb-[7px] block font-mono text-[10px] font-medium tracking-[0.12em] text-sched-text-muted"
                >
                  DESCRIPTION
                </label>
                <input
                  id="award-desc"
                  type="text"
                  value={awardDescription}
                  onChange={(e) => setAwardDescription(e.target.value)}
                  placeholder="What are these points for?"
                  className={`${inputClass} w-full`}
                />
              </div>
            </div>
          </div>
          {awardError && (
            <p className="mt-3 font-mono text-xs text-sched-coral">
              {awardError}
            </p>
          )}
          <button
            type="button"
            onClick={handleAward}
            disabled={awarding}
            className="mt-4 bg-sched-accent px-5 py-[11px] font-display text-[13px] font-semibold tracking-[0.07em] text-sched-fill transition-[filter] hover:brightness-[1.12] disabled:opacity-60"
          >
            {formEntry ? "UPDATE POINTS" : "AWARD POINTS"}
          </button>
        </div>
      )}
    </div>
  );
}
