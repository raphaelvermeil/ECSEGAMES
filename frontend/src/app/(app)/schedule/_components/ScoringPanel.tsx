"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import api from "@/lib/api";
import {
  SEGMENTS,
  TEAMS,
  teamLabel,
  type ScoreEntry,
  type Team,
} from "@/lib/scores";
import { formatFooterTimestamp } from "@/lib/schedule";

const inputClass =
  "box-border border border-sched-hair bg-sched-bg-raised px-[10px] py-[9px] font-mono text-[13px] text-sched-cream placeholder:text-[#5d7063] [color-scheme:dark]";

function pointsText(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function errorMessage(err: unknown): string {
  const status =
    typeof err === "object" && err !== null && "response" in err
      ? (err as { response?: { status?: number } }).response?.status
      : undefined;
  if (status === 403) return "You don't have permission to do that.";
  if (status === 409) return "This entry was already revoked.";
  return "Something went wrong. Please try again.";
}

export default function ScoringPanel({ eventId }: { eventId: string }) {
  const { getToken } = useAuth();
  const [scores, setScores] = useState<ScoreEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const [awardTeam, setAwardTeam] = useState<Team>("electrical");
  const [awardSegment, setAwardSegment] = useState(SEGMENTS[0]);
  const [awardPoints, setAwardPoints] = useState("");
  const [awardDescription, setAwardDescription] = useState("");
  const [awardError, setAwardError] = useState<string | null>(null);
  const [awarding, setAwarding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const res = await api.get<ScoreEntry[]>(
          `/api/events/${eventId}/scores`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!cancelled) setScores(res.data);
      } catch {
        if (!cancelled) setLoadError("Could not load scores.");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [eventId, getToken]);

  function openMenu(id: string | null) {
    setMenuFor(id);
    setEditingId(null);
    setConfirmingId(null);
  }
  function openEdit(entry: ScoreEntry) {
    setEditingId(entry.id);
    setEditValue(String(entry.value));
    setEditDescription(entry.description);
    setEditError(null);
    setMenuFor(null);
    setConfirmingId(null);
  }
  function openConfirmDelete(id: string) {
    setConfirmingId(id);
    setRevokeError(null);
    setMenuFor(null);
    setEditingId(null);
  }

  async function handleSaveEdit(id: string) {
    const value = Number(editValue);
    if (!editValue || Number.isNaN(value) || value === 0) {
      setEditError("Enter a non-zero number of points.");
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      const token = await getToken();
      const res = await api.patch<ScoreEntry>(
        `/api/events/${eventId}/scores/${id}`,
        { value, description: editDescription },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setScores(
        (prev) => prev?.map((s) => (s.id === id ? res.data : s)) ?? prev,
      );
      setEditingId(null);
    } catch (err) {
      setEditError(errorMessage(err));
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleRevoke(id: string) {
    setRevoking(true);
    setRevokeError(null);
    try {
      const token = await getToken();
      const res = await api.delete<ScoreEntry>(
        `/api/events/${eventId}/scores/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setScores(
        (prev) => prev?.map((s) => (s.id === id ? res.data : s)) ?? prev,
      );
      setConfirmingId(null);
    } catch (err) {
      setRevokeError(errorMessage(err));
    } finally {
      setRevoking(false);
    }
  }

  async function handleAward() {
    const value = Number(awardPoints);
    if (!awardPoints || Number.isNaN(value) || value === 0) {
      setAwardError("Enter a non-zero number of points.");
      return;
    }
    setAwarding(true);
    setAwardError(null);
    try {
      const token = await getToken();
      const res = await api.post<ScoreEntry>(
        `/api/events/${eventId}/scores`,
        {
          team: awardTeam,
          segment: awardSegment,
          value,
          description: awardDescription,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setScores((prev) => [...(prev ?? []), res.data]);
      setAwardPoints("");
      setAwardDescription("");
    } catch (err) {
      setAwardError(errorMessage(err));
    } finally {
      setAwarding(false);
    }
  }

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
            className="hidden gap-[10px] border-b border-sched-hair pb-[9px] font-mono text-[10px] font-medium tracking-[0.12em] text-sched-text-muted lg:grid"
            style={{ gridTemplateColumns: "1fr 1.3fr .7fr .9fr .6fr 36px" }}
          >
            <span>RECIPIENT</span>
            <span>SEGMENT</span>
            <span>POINTS</span>
            <span>AWARDED BY</span>
            <span>WHEN</span>
            <span />
          </div>

          {scores === null && (
            <p className="py-4 font-mono text-xs text-sched-text-muted">
              Loading…
            </p>
          )}
          {scores !== null && scores.length === 0 && (
            <p className="py-4 font-mono text-xs text-sched-text-muted">
              No points awarded yet.
            </p>
          )}

          {scores?.map((s) => {
            const revokedTag = (
              <span className="border border-[rgba(255,123,84,.45)] px-[6px] py-[3px] font-mono text-[9px] font-medium tracking-[0.1em] text-sched-coral">
                REVOKED
              </span>
            );
            const menuBtn = (
              <button
                type="button"
                onClick={() => openMenu(menuFor === s.id ? null : s.id)}
                aria-label="Score actions"
                className="flex h-6 w-7 items-center justify-center border border-transparent font-mono text-sm text-sched-text-muted transition-colors hover:border-sched-hair hover:text-sched-accent"
              >
                ···
              </button>
            );
            return (
              <div key={s.id} className="border-b border-[rgba(63,143,87,.18)]">
                {/* Desktop — flat 6-column table row (shows segment). */}
                <div className="hidden lg:block">
                  <div
                    className="grid items-center gap-[10px] py-[11px]"
                    style={{
                      gridTemplateColumns: "1fr 1.3fr .7fr .9fr .6fr 36px",
                      opacity: s.revoked ? 0.5 : 1,
                    }}
                  >
                    <span
                      className="font-mono text-[13px] text-sched-cream"
                      style={{
                        textDecoration: s.revoked ? "line-through" : "none",
                      }}
                    >
                      {teamLabel(s.team)}
                    </span>
                    <span
                      className="font-mono text-xs text-sched-text"
                      style={{
                        textDecoration: s.revoked ? "line-through" : "none",
                      }}
                    >
                      {s.segment}
                    </span>
                    <span
                      className="font-display text-[17px] font-medium"
                      style={{
                        color:
                          s.value > 0
                            ? "var(--color-sched-accent)"
                            : "var(--color-sched-coral)",
                        textDecoration: s.revoked ? "line-through" : "none",
                      }}
                    >
                      {pointsText(s.value)}
                    </span>
                    <span className="font-mono text-xs text-sched-text-muted">
                      {s.awardedBy}
                    </span>
                    <span className="font-mono text-xs text-sched-text-muted">
                      {formatFooterTimestamp(s.awardedAt)}
                    </span>
                    <span className="flex justify-end">
                      {s.revoked ? revokedTag : menuBtn}
                    </span>
                  </div>

                  {menuFor === s.id && (
                    <div className="flex gap-2 pb-[11px]">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="border border-sched-hair px-3 py-[6px] font-mono text-[11px] text-sched-text transition-colors hover:border-sched-accent hover:text-sched-accent"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openConfirmDelete(s.id)}
                        className="border border-[rgba(255,123,84,.35)] px-3 py-[6px] font-mono text-[11px] text-sched-coral transition-colors hover:border-sched-coral"
                      >
                        Delete
                      </button>
                    </div>
                  )}

                  {editingId === s.id && (
                    <div className="flex flex-wrap items-center gap-[10px] pb-3">
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        aria-label="Points"
                        className={`${inputClass} w-[100px]`}
                      />
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        aria-label="Description"
                        className={`${inputClass} min-w-[200px] flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(s.id)}
                        disabled={editSubmitting}
                        className="bg-sched-accent px-[14px] py-2 font-display text-[11px] font-semibold tracking-[0.08em] text-sched-fill disabled:opacity-60"
                      >
                        SAVE
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-[6px] py-2 font-mono text-[11px] text-sched-text-muted underline"
                      >
                        Cancel
                      </button>
                      {editError && (
                        <p className="w-full font-mono text-xs text-sched-coral">
                          {editError}
                        </p>
                      )}
                    </div>
                  )}

                  {confirmingId === s.id && (
                    <div className="flex flex-wrap items-center gap-[14px] pb-3">
                      <span className="font-mono text-xs text-sched-coral">
                        Remove {s.value} points from {teamLabel(s.team)}?
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRevoke(s.id)}
                        disabled={revoking}
                        className="border border-sched-coral px-3 py-[6px] font-mono text-[11px] font-medium tracking-[0.08em] text-sched-coral disabled:opacity-60"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="px-[2px] py-[6px] font-mono text-[11px] text-sched-text-muted underline"
                      >
                        Cancel
                      </button>
                      {revokeError && (
                        <p className="w-full font-mono text-xs text-sched-coral">
                          {revokeError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Mobile — stacked card (shows description, not segment). */}
                <div className="py-[11px] lg:hidden">
                  <div
                    className="flex items-start justify-between gap-[10px]"
                    style={{ opacity: s.revoked ? 0.5 : 1 }}
                  >
                    <div className="min-w-0">
                      <div
                        className="font-mono text-[13px] text-sched-cream"
                        style={{
                          textDecoration: s.revoked ? "line-through" : "none",
                        }}
                      >
                        {teamLabel(s.team)}
                      </div>
                      <div
                        className="mt-1 font-mono text-[11px] text-sched-text"
                        style={{
                          textDecoration: s.revoked ? "line-through" : "none",
                        }}
                      >
                        {s.description}
                      </div>
                      <div className="mt-[7px] font-mono text-[10px] text-sched-text-muted">
                        {s.awardedBy} · {formatFooterTimestamp(s.awardedAt)}
                      </div>
                    </div>
                    <div className="flex flex-none items-center gap-[6px]">
                      <span
                        className="font-display text-[19px] font-medium"
                        style={{
                          color:
                            s.value > 0
                              ? "var(--color-sched-accent)"
                              : "var(--color-sched-coral)",
                          textDecoration: s.revoked ? "line-through" : "none",
                        }}
                      >
                        {pointsText(s.value)}
                      </span>
                      {!s.revoked && menuBtn}
                    </div>
                  </div>
                  {s.revoked && <div className="mt-[9px] inline-block">{revokedTag}</div>}

                  {menuFor === s.id && (
                    <div className="mt-[11px] flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="min-h-10 flex-1 border border-sched-hair px-[10px] font-mono text-[11px] text-sched-text transition-colors hover:border-sched-accent hover:text-sched-accent"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openConfirmDelete(s.id)}
                        className="min-h-10 flex-1 border border-[rgba(255,123,84,.35)] px-[10px] font-mono text-[11px] text-sched-coral transition-colors hover:border-sched-coral"
                      >
                        Delete
                      </button>
                    </div>
                  )}

                  {editingId === s.id && (
                    <div className="mt-[11px] flex flex-col gap-[9px]">
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        aria-label="Points"
                        className={`${inputClass} w-full`}
                      />
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        aria-label="Description"
                        className={`${inputClass} w-full`}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(s.id)}
                          disabled={editSubmitting}
                          className="min-h-10 flex-1 bg-sched-accent font-display text-[12px] font-semibold tracking-[0.08em] text-sched-fill disabled:opacity-60"
                        >
                          SAVE
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="min-h-10 px-3 font-mono text-[11px] text-sched-text-muted underline"
                        >
                          Cancel
                        </button>
                      </div>
                      {editError && (
                        <p className="font-mono text-xs text-sched-coral">
                          {editError}
                        </p>
                      )}
                    </div>
                  )}

                  {confirmingId === s.id && (
                    <div className="mt-[11px]">
                      <p className="font-mono text-xs leading-[1.6] text-sched-coral">
                        Remove {s.value} points from {teamLabel(s.team)}?
                      </p>
                      <div className="mt-[9px] flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleRevoke(s.id)}
                          disabled={revoking}
                          className="min-h-10 flex-1 border border-sched-coral font-mono text-[11px] font-medium tracking-[0.08em] text-sched-coral disabled:opacity-60"
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="min-h-10 px-3 font-mono text-[11px] text-sched-text-muted underline"
                        >
                          Cancel
                        </button>
                      </div>
                      {revokeError && (
                        <p className="mt-[9px] font-mono text-xs text-sched-coral">
                          {revokeError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      <div className="mt-[22px] border border-sched-hair bg-sched-bg p-[18px]">
        <h4 className="mb-[14px] font-mono text-[11px] font-medium tracking-[0.16em] text-sched-text-muted">
          AWARD POINTS
        </h4>
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-[14px]">
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
                    onClick={() => setAwardTeam(t.value)}
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
          <div>
            <label
              htmlFor="award-segment"
              className="mb-[7px] block font-mono text-[10px] font-medium tracking-[0.12em] text-sched-text-muted"
            >
              SEGMENT
            </label>
            <select
              id="award-segment"
              value={awardSegment}
              onChange={(e) => setAwardSegment(e.target.value)}
              className={`${inputClass} w-full`}
            >
              {SEGMENTS.map((seg) => (
                <option key={seg} value={seg}>
                  {seg}
                </option>
              ))}
            </select>
          </div>
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
              className={`${inputClass} w-full`}
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
          AWARD POINTS
        </button>
      </div>
    </div>
  );
}
