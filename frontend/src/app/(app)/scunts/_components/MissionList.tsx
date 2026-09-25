"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Trash } from "@/components/icons";
import {
  CATEGORIES,
  createTask,
  deleteTask,
  listTasks,
  setTaskDone,
  updateTask,
  type ScuntsCategory,
  type ScuntsTask,
} from "@/lib/scunts";

const inputClass =
  "box-border w-full border border-sched-hair bg-sched-bg px-[12px] py-[11px] font-mono text-sm text-sched-cream placeholder:text-[#5d7063] [color-scheme:dark] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sched-accent";

export default function MissionList({ canManage }: { canManage: boolean }) {
  const { getToken } = useAuth();
  const [tasks, setTasks] = useState<ScuntsTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Which category the exec "add" form is open on, and what's typed in it.
  const [adding, setAdding] = useState<ScuntsCategory | null>(null);
  const [draft, setDraft] = useState("");
  // The task currently being edited, if any.
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const load = useCallback(async () => listTasks(await getToken()), [getToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await load();
        if (!cancelled) setTasks(data);
      } catch {
        if (!cancelled) setError("Could not load the mission list.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Tick optimistically so the box responds instantly, then reconcile with
  // the server. On failure the tick is rolled back rather than left showing
  // a state the rest of the team won't see.
  async function toggle(task: ScuntsTask) {
    const next = !task.done;
    setTasks(
      (prev) =>
        prev?.map((t) => (t.id === task.id ? { ...t, done: next } : t)) ?? null,
    );
    try {
      await setTaskDone(await getToken(), task.id, next);
      setTasks(await load());
    } catch {
      setError("Could not save that. Check your connection.");
      setTasks(
        (prev) =>
          prev?.map((t) =>
            t.id === task.id ? { ...t, done: task.done } : t,
          ) ?? null,
      );
    }
  }

  async function add(category: ScuntsCategory) {
    const text = draft.trim();
    if (!text) return;
    try {
      await createTask(await getToken(), category, text, "");
      setDraft("");
      setAdding(null);
      setTasks(await load());
    } catch {
      setError("Could not add that mission.");
    }
  }

  async function saveEdit(id: string) {
    const text = editText.trim();
    if (!text) return;
    try {
      await updateTask(await getToken(), id, text, "");
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

      {CATEGORIES.map((cat) => {
        const group = tasks.filter((t) => t.category === cat.value);
        const groupDone = group.filter((t) => t.done).length;
        return (
          <section key={cat.value} className="mt-7">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-sched-text-muted">
              {cat.label} · {groupDone}/{group.length}
            </h3>

            <ul className="mt-3 space-y-1.5">
              {group.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start gap-3 rounded-sm border border-sched-hair bg-sched-bg-raised px-3 py-2.5"
                >
                  {/* The whole row is the hit target: a bare checkbox is a
                      hard tap on a phone in a dark bar. */}
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggle(task)}
                    aria-label={task.text}
                    className="mt-0.5 h-[18px] w-[18px] flex-none accent-sched-accent"
                  />

                  <div className="min-w-0 flex-1">
                    {editing === task.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className={inputClass}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(task.id)}
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
                        <p
                          className={`text-sm leading-snug ${
                            task.done
                              ? "text-sched-text-muted line-through"
                              : "text-sched-cream"
                          }`}
                        >
                          {task.text}
                        </p>
                        {task.note && (
                          <p className="mt-1 font-mono text-[11px] text-sched-text-muted">
                            {task.note}
                          </p>
                        )}
                        <p className="mt-1 font-mono text-[11px] text-sched-text-muted">
                          {task.points} pts
                          {task.done && task.doneByName
                            ? ` · ticked by ${task.doneByName}`
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
                </li>
              ))}
            </ul>

            {canManage &&
              (adding === cat.value ? (
                <div className="mt-2 flex flex-col gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`New ${cat.label} mission`}
                    className={inputClass}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => add(cat.value)}
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
                    setAdding(cat.value);
                    setDraft("");
                  }}
                  className="mt-2 border border-sched-hair px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-sched-text-muted transition-colors hover:border-sched-accent hover:text-sched-accent"
                >
                  + Add mission
                </button>
              ))}
          </section>
        );
      })}
    </div>
  );
}
