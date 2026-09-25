"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Camera, Check, Trash } from "@/components/icons";
import {
  ACCEPTED_TYPES,
  DEFAULT_TASK_POINTS,
  MAX_CAPTION_LEN,
  createSection,
  createTask,
  deleteTask,
  listSections,
  listTasks,
  prepareProof,
  updateTask,
  upload,
  type ScuntsCategory,
  type ScuntsSection,
  type ScuntsTask,
} from "@/lib/scunts";

const fieldClass =
  "box-border border border-sched-hair bg-sched-bg px-[12px] py-[11px] font-mono text-sm text-sched-cream placeholder:text-[#5d7063] [color-scheme:dark] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sched-accent";
const inputClass = `${fieldClass} w-full`;
const pointsClass = `${fieldClass} w-[104px]`;
const fieldLabelClass =
  "font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-sched-text-muted";

export default function MissionList({ canManage }: { canManage: boolean }) {
  const { getToken } = useAuth();
  const [tasks, setTasks] = useState<ScuntsTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Which category the exec "add" form is open on, and what's typed in it.
  const [adding, setAdding] = useState<ScuntsCategory | null>(null);
  const [draft, setDraft] = useState("");
  const [draftPoints, setDraftPoints] = useState(String(DEFAULT_TASK_POINTS));
  // The task currently being edited, if any.
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editPoints, setEditPoints] = useState("");
  // Which section is shown ("all" shows every one), and the search box.
  const [filter, setFilter] = useState<ScuntsCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [sections, setSections] = useState<ScuntsSection[]>([]);
  // The exec "add section" form: open or not, and what's typed in it.
  const [addingSection, setAddingSection] = useState(false);
  const [sectionLabel, setSectionLabel] = useState("");
  const [sectionPrefix, setSectionPrefix] = useState("");
  // The mission whose proof form is open, its details box, and upload state.
  const [proofFor, setProofFor] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => listTasks(await getToken()), [getToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const [data, secs] = await Promise.all([
          listTasks(token),
          listSections(token),
        ]);
        if (!cancelled) {
          setTasks(data);
          setSections(secs);
        }
      } catch {
        if (!cancelled) setError("Could not load the mission list.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  async function addSection() {
    const label = sectionLabel.trim();
    const prefix = sectionPrefix.trim();
    if (!label || !prefix) return;
    try {
      const token = await getToken();
      await createSection(token, label, prefix);
      setSections(await listSections(token));
      setAddingSection(false);
      setSectionLabel("");
      setSectionPrefix("");
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response
        ?.status;
      setError(
        status === 409
          ? `Prefix "${prefix.toUpperCase()}" is already used by another section.`
          : "Could not add that section. The prefix must be 1-3 letters.",
      );
    }
  }

  // Upload proof for one mission. It lands as pending: the mission only
  // crosses off once an exec accepts it.
  async function submitProof(
    task: ScuntsTask,
    code: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    // Clear immediately so picking the same file twice still fires onChange.
    e.target.value = "";
    if (!file) return;

    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const toSend = await prepareProof(file);
      await upload(await getToken(), toSend, task.id, details.trim());
      setProofFor(null);
      setDetails("");
      setNotice(`Proof for ${code} sent. An exec will review it.`);
      setTasks(await load());
    } catch (err) {
      const res = (err as { response?: { status?: number } }).response;
      setError(
        res?.status === 409
          ? "Your team already completed that mission."
          : !res && err instanceof Error && err.message !== "upload failed"
            ? err.message
            : "Upload failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  // An empty or non-numeric box falls back to the default instead of
  // creating a mission worth nothing.
  function pointsOr(value: string, fallback: number) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
  }

  async function add(category: ScuntsCategory) {
    const text = draft.trim();
    if (!text) return;
    try {
      await createTask(
        await getToken(),
        category,
        text,
        "",
        pointsOr(draftPoints, DEFAULT_TASK_POINTS),
      );
      setDraft("");
      setDraftPoints(String(DEFAULT_TASK_POINTS));
      setAdding(null);
      setTasks(await load());
    } catch {
      setError("Could not add that mission.");
    }
  }

  async function saveEdit(id: string, current: number) {
    const text = editText.trim();
    if (!text) return;
    try {
      await updateTask(
        await getToken(),
        id,
        text,
        "",
        pointsOr(editPoints, current),
      );
      setEditing(null);
      setTasks(await load());
    } catch {
      setError("Could not save that edit.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this mission for every team?")) return;
    try {
      await deleteTask(await getToken(), id);
      setTasks(await load());
    } catch {
      setError("Could not delete that mission.");
    }
  }

  if (tasks === null) {
    return (
      <p className="mt-3 font-mono text-xs text-sched-text-muted">Loading…</p>
    );
  }

  const doneCount = tasks.filter((t) => t.done).length;
  const points = tasks
    .filter((t) => t.done)
    .reduce((sum, t) => sum + t.points, 0);

  return (
    <div className="mt-3">
      {/* Your team's running tally. Points are shown here only — ticking a
          mission doesn't write to the leaderboard; execs still award. */}
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-sched-accent">
        {doneCount} / {tasks.length} done · {points} pts
      </p>

      {error && (
        <p className="mt-2 font-mono text-xs text-sched-coral" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-2 font-mono text-xs text-sched-accent" role="status">
          {notice}
        </p>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search missions (e.g. G12 or a word)"
        className={`${inputClass} mt-4`}
        aria-label="Search missions"
      />

      <div className="mt-3 flex flex-wrap gap-1.5">
        {[{ key: "all", label: "All" }, ...sections].map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setFilter(c.key)}
            aria-pressed={filter === c.key}
            className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
              filter === c.key
                ? "border-sched-accent bg-sched-accent text-sched-fill"
                : "border-sched-hair text-sched-text-muted hover:border-sched-accent hover:text-sched-accent"
            }`}
          >
            {c.label}
          </button>
        ))}
        {canManage && !addingSection && (
          <button
            type="button"
            onClick={() => setAddingSection(true)}
            className="border border-dashed border-sched-hair px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-sched-text-muted transition-colors hover:border-sched-accent hover:text-sched-accent"
          >
            + Add section
          </button>
        )}
      </div>

      {canManage && addingSection && (
        <div className="mt-3 flex flex-col gap-2">
          <input
            value={sectionLabel}
            onChange={(e) => setSectionLabel(e.target.value)}
            placeholder="Section name (e.g. Ultimate Rallies)"
            className={inputClass}
            aria-label="Section name"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <span className={fieldLabelClass}>Number prefix</span>
            <input
              value={sectionPrefix}
              onChange={(e) => setSectionPrefix(e.target.value)}
              placeholder="U"
              maxLength={3}
              className={pointsClass}
              aria-label="Number prefix"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addSection}
              className="bg-sched-accent px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-sched-fill"
            >
              Add section
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingSection(false);
                setSectionLabel("");
                setSectionPrefix("");
              }}
              className="border border-sched-hair px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-sched-text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {sections
        .filter((cat) => filter === "all" || filter === cat.key)
        .map((cat) => {
          const group = tasks
            .filter((t) => t.category === cat.key)
            .map((t, i) => ({ ...t, code: `${cat.prefix}${i + 1}` }));
          const groupDone = group.filter((t) => t.done).length;
          // Matches the mission number (G12) or the start of any word in its
          // text, so "pho" finds "Take a photo…".
          const q = query.trim().toLowerCase();
          const shown = q
            ? group.filter(
                (t) =>
                  t.code.toLowerCase().startsWith(q) ||
                  t.text
                    .toLowerCase()
                    .split(/\s+/)
                    .some((w) => w.startsWith(q)),
              )
            : group;
          // While searching, sections with no hits are dropped entirely.
          if (q && shown.length === 0) return null;
          return (
            <section key={cat.key} className="mt-7">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-sched-text-muted">
                {cat.label} · {groupDone}/{group.length}
              </h3>

              {/* Add sits above the list: at the bottom of an 80-row
                checklist it was a scroll away, and a mission added during
                the event is the thing an exec most wants to reach. */}
              {canManage &&
                (adding === cat.key ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={`New ${cat.label} mission`}
                      className={inputClass}
                      aria-label="Mission text"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <span className={fieldLabelClass}>Points</span>
                      <input
                        type="number"
                        min={0}
                        value={draftPoints}
                        onChange={(e) => setDraftPoints(e.target.value)}
                        className={pointsClass}
                        aria-label="Points"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => add(cat.key)}
                        className="bg-sched-accent px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-sched-fill"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdding(null);
                          setDraft("");
                        }}
                        className="border border-sched-hair px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-sched-text-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(cat.key);
                      setDraft("");
                      setDraftPoints(String(DEFAULT_TASK_POINTS));
                    }}
                    className="mt-3 border border-sched-hair px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-sched-text-muted transition-colors hover:border-sched-accent hover:text-sched-accent"
                  >
                    + Add mission
                  </button>
                ))}

              <ul className="mt-3 space-y-1.5">
                {shown.map((task) => (
                  <li
                    key={task.id}
                    className="rounded-sm border border-sched-hair bg-sched-bg-raised px-3 py-2.5"
                  >
                    <div className="flex items-start gap-3">
                      {/* A mission is crossed off only by an exec accepting
                      proof, so this box is a status, not a control. */}
                      <span
                        aria-hidden
                        className={`mt-1 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[3px] border ${
                          task.done
                            ? "border-sched-accent bg-sched-accent text-sched-fill"
                            : "border-sched-hair bg-sched-bg text-transparent"
                        }`}
                      >
                        <Check width={14} height={14} strokeWidth={3} />
                      </span>

                      <div className="min-w-0 flex-1">
                        {editing === task.id ? (
                          <div className="flex flex-col gap-2">
                            <input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className={inputClass}
                              aria-label="Mission text"
                            />
                            <div className="flex items-center gap-2">
                              <span className={fieldLabelClass}>Points</span>
                              <input
                                type="number"
                                min={0}
                                value={editPoints}
                                onChange={(e) => setEditPoints(e.target.value)}
                                className={pointsClass}
                                aria-label="Points"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => saveEdit(task.id, task.points)}
                                className="bg-sched-accent px-3 py-1.5 font-mono text-[11px] font-semibold text-sched-fill"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditing(null)}
                                className="border border-sched-hair px-3 py-1.5 font-mono text-[11px] text-sched-text-muted"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Tapping an open mission opens its proof form;
                            a completed one can't take more proof. */}
                            <button
                              type="button"
                              disabled={task.done}
                              onClick={() => {
                                setProofFor(
                                  proofFor === task.id ? null : task.id,
                                );
                                setDetails("");
                              }}
                              aria-expanded={proofFor === task.id}
                              className={`block w-full text-left font-mono text-[13px] leading-relaxed ${
                                task.done
                                  ? "cursor-default text-sched-text-muted line-through"
                                  : "text-sched-cream hover:text-sched-accent"
                              }`}
                            >
                              <span className="mr-2 font-semibold text-sched-accent">
                                {task.code}
                              </span>
                              {task.text}
                            </button>
                            {task.note && (
                              <p className="mt-1 font-mono text-[11px] text-sched-text-muted">
                                {task.note}
                              </p>
                            )}
                            <p className="mt-1 font-mono text-[11px] text-sched-text-muted">
                              {task.points} pts
                              {task.done
                                ? task.doneByName
                                  ? ` · done, proof by ${task.doneByName}`
                                  : " · done"
                                : task.pending
                                  ? " · proof awaiting review"
                                  : ""}
                            </p>
                          </>
                        )}
                      </div>

                      {canManage && editing !== task.id && (
                        <div className="flex flex-none gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(task.id);
                              setEditText(task.text);
                              setEditPoints(String(task.points));
                            }}
                            className="border border-sched-hair px-[8px] py-[5px] font-mono text-[11px] text-sched-text-muted transition-colors hover:border-sched-accent hover:text-sched-accent"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(task.id)}
                            aria-label="Delete mission"
                            className="border border-sched-coral px-[8px] py-[5px] text-sched-coral transition-colors hover:bg-sched-coral hover:text-sched-bg"
                          >
                            <Trash width={13} height={13} strokeWidth={2} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Full card width rather than the text column beside
                      the checkbox and exec buttons, which left it a narrow
                      strip on a phone. Details come first on purpose:
                      picking a file submits straight away, so anything
                      typed after that would be lost. */}
                    {proofFor === task.id && !task.done && (
                      <div className="mt-3 flex flex-col gap-3 border-t border-sched-hair pt-4">
                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor={`details-${task.id}`}
                            className={fieldLabelClass}
                          >
                            1. Add details{" "}
                            <span className="normal-case tracking-normal">
                              (optional)
                            </span>
                          </label>
                          <textarea
                            id={`details-${task.id}`}
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            maxLength={MAX_CAPTION_LEN}
                            rows={3}
                            placeholder="Who's in it, where it was taken…"
                            className={`${inputClass} resize-none`}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className={fieldLabelClass}>
                            2. Upload photo or video
                          </span>
                          <label
                            className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 bg-sched-accent px-5 py-3 font-display text-sm font-semibold tracking-[0.07em] text-sched-fill transition-[filter] hover:brightness-[1.12] sm:w-fit ${
                              busy ? "pointer-events-none opacity-60" : ""
                            }`}
                          >
                            <Camera width={16} height={16} strokeWidth={2} />
                            {busy
                              ? "Uploading…"
                              : `Upload proof · ${task.code}`}
                            <input
                              type="file"
                              accept={ACCEPTED_TYPES}
                              onChange={(e) => submitProof(task, task.code, e)}
                              disabled={busy}
                              className="hidden"
                            />
                          </label>
                          <p className="font-mono text-[11px] leading-relaxed text-sched-text-muted">
                            Picking a file submits it right away.
                            <br />
                            Photos are shrunk automatically · videos up to 60 s.
                          </p>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
    </div>
  );
}
