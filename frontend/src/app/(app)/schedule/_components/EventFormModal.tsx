"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { X } from "@/components/icons";
import api from "@/lib/api";
import type { EventCategory, ScheduleEvent } from "@/lib/events";
import { useScrollLock, useThemeColor } from "@/lib/overlay";
import {
  SHORT_DESCRIPTION_MAX,
  formatDayLabel,
  formatModalDate,
  formatTime,
  withAlpha,
  zonedDate,
  zonedParts,
} from "@/lib/schedule";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// The Games run one fixed weekend — events can only start on one of these
// three days. Change GAMES_YEAR when the Games move to a new year.
const GAMES_YEAR = 2026;
const GAMES_MONTH = 8; // September (0-indexed)
const GAMES_DAYS = [25, 26, 27];
const ACCENT_WASH = "rgba(110, 231, 135, 0.12)";

// No width utility baked in here on purpose: Tailwind's cascade order isn't
// determined by className order, so appending e.g. `w-[110px]` after a
// `w-full` already in this string wouldn't reliably override it. Callers add
// their own width class (`w-full`, `flex-1`, `w-[110px]`, ...).
// `[color-scheme:dark]` tells the browser to draw native form-control chrome
// (the date input's calendar icon, the time input's clock icon) in light
// colours meant for a dark background — without it they render near-black
// and are almost invisible against `bg-sched-bg`.
const inputClass =
  "box-border border border-sched-hair bg-sched-bg px-[12px] py-[11px] font-mono text-sm text-sched-cream placeholder:text-[#5d7063] [color-scheme:dark] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sched-accent";
const errorClass = "mt-2 font-mono text-xs text-sched-coral";
const labelClass =
  "mb-[7px] block font-mono text-[10px] font-medium tracking-[0.14em] text-sched-text-muted";

interface FormFields {
  title: string;
  shortDescription: string;
  longDescription: string;
  access: string;
  captain: string;
  categories: string[];
  // The start date. New events are always on the Games weekend; an existing
  // event keeps whatever date it has, even off-weekend, so editing its title
  // can't silently move it.
  year: number;
  month: number; // 0-based
  day: number;
  st: string; // start time, "HH:mm"
  durationHours: string; // free text so the field can be empty mid-edit
  location: string;
}

interface FormErrors {
  title?: string;
  shortDescription?: string;
  start?: string;
  duration?: string;
  location?: string;
}

function initialFields(event: ScheduleEvent | null): FormFields {
  if (event) {
    const start = new Date(event.startsAt);
    const end = new Date(event.endsAt);
    // Whole minutes, so a 25-minute event round-trips as exactly 25 minutes
    // instead of drifting a few seconds on every save.
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    const p = zonedParts(start);
    return {
      title: event.title,
      shortDescription: event.shortDescription,
      longDescription: event.longDescription,
      access: event.access,
      captain: event.captain,
      categories: event.categories,
      year: p.year,
      month: p.month,
      day: p.day,
      st: formatTime(start),
      durationHours: String(Math.round((minutes / 60) * 10000) / 10000),
      location: event.location,
    };
  }
  return {
    title: "",
    shortDescription: "",
    longDescription: "",
    access: "",
    captain: "",
    categories: [],
    year: GAMES_YEAR,
    month: GAMES_MONTH,
    day: GAMES_DAYS[0],
    st: "",
    durationHours: "",
    location: "",
  };
}

// Builds the start instant from the form's date and time fields, in the
// Games' timezone — there's no free-form date to parse.
function buildStart(f: FormFields): Date | null {
  if (!f.st) return null;
  const [h, m] = f.st.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return zonedDate(f.year, f.month, f.day, h, m);
}

// Whether the form's date is one of the Games days; an existing event may
// sit elsewhere, and the picker shows that rather than hiding it.
function onGamesWeekend(f: FormFields): boolean {
  return (
    f.year === GAMES_YEAR &&
    f.month === GAMES_MONTH &&
    GAMES_DAYS.includes(f.day)
  );
}

function validate(f: FormFields): FormErrors {
  const errors: FormErrors = {};
  if (!f.title.trim()) {
    errors.title = "Add a title so people know what this is.";
  }
  if (!f.shortDescription.trim()) {
    errors.shortDescription =
      "Add a one-line description — it appears in the upcoming list.";
  } else if (f.shortDescription.length > SHORT_DESCRIPTION_MAX) {
    errors.shortDescription = "Trim this to 80 characters or fewer.";
  }
  if (!f.st) {
    errors.start = "Set a start time.";
  }
  const hours = Number(f.durationHours);
  if (!f.durationHours || Number.isNaN(hours) || hours < 0.25) {
    errors.duration = "Set how many hours this runs for (at least 0.25).";
  } else if (hours > 72) {
    errors.duration = "Keep this under 72 hours.";
  }
  if (!f.location.trim()) {
    errors.location = "Add a location, or write Online.";
  }
  return errors;
}

function errorMessage(err: unknown): string {
  const status =
    typeof err === "object" && err !== null && "response" in err
      ? (err as { response?: { status?: number } }).response?.status
      : undefined;
  if (status === 403) return "You don't have permission to do that.";
  if (status === 400)
    return "Some of these fields aren't valid — double check and try again.";
  return "Could not save this event. Please try again.";
}

export default function EventFormModal({
  mode,
  event,
  categories,
  onClose,
  onSaved,
  onDeleted,
}: {
  mode: "create" | "edit";
  event: ScheduleEvent | null;
  categories: EventCategory[];
  onClose: () => void;
  onSaved: (saved: ScheduleEvent) => void;
  onDeleted: () => void;
}) {
  const { getToken } = useAuth();
  const [fields, setFields] = useState<FormFields>(() => initialFields(event));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const panelRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const shortRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);

  const FIELD_ORDER: Array<
    [keyof FormErrors, React.RefObject<HTMLInputElement | null>]
  > = [
    ["title", titleRef],
    ["shortDescription", shortRef],
    ["start", startRef],
    ["duration", durationRef],
    ["location", locationRef],
  ];

  function set<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  // Choosing a Games day also pins the year and month, which is what moves
  // an off-weekend event onto the weekend on purpose rather than by accident.
  function pickDay(day: number) {
    setFields((f) => ({ ...f, year: GAMES_YEAR, month: GAMES_MONTH, day }));
  }

  // Full-screen and opaque below lg, so the top edge is the panel itself
  // (--color-sched-bg-raised) rather than a dimmed blend of the page.
  useScrollLock();
  useThemeColor("#101a15");

  // Focus the panel on open, and hand focus back to whatever triggered it on
  // close — same pattern as EventDetailModal, including preventScroll: this
  // panel animates in from translateY(100%) too, so focusing it without that
  // flag scrolls the overlay to reveal a sheet that is still off-screen.
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });
    return () => trigger?.focus?.();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      // Same visibility filter as EventDetailModal — without it, a hidden
      // (display:none) focusable at either end of the DOM order would make
      // the trap boundary a silent no-op.
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetWidth || el.offsetHeight);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (active === last || active === panelRef.current)
      ) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSave() {
    const errs = validate(fields);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      for (const [key, ref] of FIELD_ORDER) {
        if (errs[key]) {
          ref.current?.focus();
          break;
        }
      }
      return;
    }

    const start = buildStart(fields)!;
    // Snap the end to a whole minute so the stored duration is exact.
    const end = new Date(
      Math.round(
        (start.getTime() + Number(fields.durationHours) * 60 * 60 * 1000) /
          60000,
      ) * 60000,
    );
    const body = {
      title: fields.title.trim(),
      shortDescription: fields.shortDescription.trim(),
      longDescription: fields.longDescription,
      access: fields.access,
      captain: fields.captain,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      location: fields.location.trim(),
      categories: fields.categories,
    };

    setSubmitting(true);
    setSubmitError(null);
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const res =
        mode === "create"
          ? await api.post<ScheduleEvent>("/api/events", body, { headers })
          : await api.put<ScheduleEvent>(`/api/events/${event!.id}`, body, {
              headers,
            });
      onSaved(res.data);
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const token = await getToken();
      await api.delete(`/api/events/${event!.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onDeleted();
    } catch {
      setDeleting(false);
      setConfirmingDelete(false);
      setSubmitError("Could not delete this event. Please try again.");
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-sched-bg lg:flex-row lg:items-start lg:justify-center lg:overflow-y-auto lg:bg-[rgba(4,9,7,.72)] lg:px-5 lg:py-12 lg:backdrop-blur-[4px] lg:animate-sched-fade"
    >
      {/* A real form, so Enter in any text field saves. */}
      <form
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "create" ? "New event" : "Edit event"}
        tabIndex={-1}
        noValidate
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="animate-sched-sheet flex h-full w-full flex-col bg-sched-bg-raised font-mono outline-none lg:animate-sched-pop lg:h-auto lg:max-w-[700px] lg:border lg:border-sched-accent-dim"
      >
        <div className="flex flex-none items-center justify-between border-b border-sched-hair px-5 pb-6 pt-[calc(1.5rem+var(--app-safe-top))] lg:px-[30px] lg:pt-6">
          <h2 className="font-display text-[22px] font-semibold tracking-[0.04em] text-sched-cream lg:text-[26px]">
            {mode === "create" ? "NEW EVENT" : "EDIT EVENT"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center border border-sched-hair text-sched-text-muted transition-colors hover:border-sched-accent hover:text-sched-accent"
          >
            <X width={14} height={14} strokeWidth={2} />
          </button>
        </div>

        <div className="grid flex-1 gap-[18px] overflow-y-auto px-5 pb-2 pt-6 lg:flex-none lg:overflow-visible lg:px-[30px]">
          <div>
            <label htmlFor="f-title" className={labelClass}>
              TITLE
            </label>
            <input
              id="f-title"
              ref={titleRef}
              type="text"
              value={fields.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Chicken Rush"
              className={`${inputClass} w-full`}
            />
            {errors.title && <p className={errorClass}>{errors.title}</p>}
          </div>

          <div>
            <div className="mb-[7px] flex items-baseline justify-between">
              <label htmlFor="f-short" className={labelClass}>
                SHORT DESCRIPTION
              </label>
              <span
                className={`font-mono text-[11px] ${
                  fields.shortDescription.length > SHORT_DESCRIPTION_MAX
                    ? "text-sched-coral"
                    : "text-sched-text-muted"
                }`}
              >
                {fields.shortDescription.length} / {SHORT_DESCRIPTION_MAX}
              </span>
            </div>
            <input
              id="f-short"
              ref={shortRef}
              type="text"
              value={fields.shortDescription}
              onChange={(e) => set("shortDescription", e.target.value)}
              placeholder="One line, shown in the upcoming list"
              className={`${inputClass} w-full`}
            />
            {errors.shortDescription && (
              <p className={errorClass}>{errors.shortDescription}</p>
            )}
          </div>

          <div>
            <label htmlFor="f-desc" className={labelClass}>
              WHAT IT IS
            </label>
            <textarea
              id="f-desc"
              rows={4}
              value={fields.longDescription}
              onChange={(e) => set("longDescription", e.target.value)}
              placeholder="Format, rules, what to bring."
              className={`${inputClass} w-full resize-y leading-[1.6]`}
            />
          </div>

          <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
            <div>
              <label htmlFor="f-access" className={labelClass}>
                ACCESS &amp; SUSTAINABILITY
              </label>
              <textarea
                id="f-access"
                rows={3}
                value={fields.access}
                onChange={(e) => set("access", e.target.value)}
                placeholder="Step-free routes, quiet space, waste plan."
                className={`${inputClass} w-full resize-y text-[13px] leading-[1.6]`}
              />
            </div>
            <div>
              <label htmlFor="f-captain" className={labelClass}>
                CAPTAIN&apos;S ROLE
              </label>
              <textarea
                id="f-captain"
                rows={3}
                value={fields.captain}
                onChange={(e) => set("captain", e.target.value)}
                placeholder="What the team captain has to do."
                className={`${inputClass} w-full resize-y text-[13px] leading-[1.6]`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <span className={labelClass}>DAY</span>
              <div
                role="radiogroup"
                aria-label="Day"
                className="flex border border-sched-hair"
              >
                {GAMES_DAYS.map((day) => {
                  const active = onGamesWeekend(fields) && fields.day === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => pickDay(day)}
                      className="flex-1 px-[6px] py-[11px] font-mono text-[11px] font-medium uppercase tracking-[0.08em]"
                      style={{
                        background: active ? ACCENT_WASH : "transparent",
                        color: active
                          ? "var(--color-sched-accent)"
                          : "var(--color-sched-text-muted)",
                        borderBottom: `2px solid ${active ? "var(--color-sched-accent)" : "transparent"}`,
                      }}
                    >
                      {formatDayLabel(
                        zonedDate(GAMES_YEAR, GAMES_MONTH, day, 12, 0),
                      )}
                    </button>
                  );
                })}
                {/* An existing event that isn't on the Games weekend keeps
                    its date, and shows it, so nothing is rewritten silently.
                    Picking one of the days above moves it. */}
                {!onGamesWeekend(fields) && (
                  <span
                    role="radio"
                    aria-checked="true"
                    className="flex-1 px-[6px] py-[11px] font-mono text-[11px] font-medium uppercase tracking-[0.08em]"
                    style={{
                      background: ACCENT_WASH,
                      color: "var(--color-sched-accent)",
                      borderBottom: "2px solid var(--color-sched-accent)",
                    }}
                  >
                    {formatModalDate(
                      zonedDate(fields.year, fields.month, fields.day, 12, 0),
                    )}
                  </span>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="f-time" className={labelClass}>
                START TIME
              </label>
              <input
                id="f-time"
                ref={startRef}
                type="time"
                value={fields.st}
                onChange={(e) => set("st", e.target.value)}
                className={`${inputClass} w-full`}
              />
              {errors.start && <p className={errorClass}>{errors.start}</p>}
            </div>
            <div>
              <label htmlFor="f-duration" className={labelClass}>
                DURATION (HRS)
              </label>
              <input
                id="f-duration"
                ref={durationRef}
                type="number"
                min="0.25"
                max="72"
                step="0.25"
                value={fields.durationHours}
                onChange={(e) => set("durationHours", e.target.value)}
                placeholder="2"
                className={`${inputClass} w-full`}
              />
              {errors.duration && (
                <p className={errorClass}>{errors.duration}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="f-loc" className={labelClass}>
              LOCATION
            </label>
            <input
              id="f-loc"
              ref={locationRef}
              type="text"
              value={fields.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Lower field, Trottier"
              className={`${inputClass} w-full`}
            />
            {errors.location && <p className={errorClass}>{errors.location}</p>}
          </div>

          <div>
            <span className={labelClass}>CATEGORIES</span>
            <div
              role="group"
              aria-label="Categories"
              className="grid grid-cols-2 border border-sched-hair lg:flex lg:flex-wrap"
            >
              {categories.map(({ name: c, color }) => {
                const active = fields.categories.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={active}
                    // Kept in the category list's order, whatever order
                    // they were clicked in.
                    onClick={() =>
                      set(
                        "categories",
                        categories
                          .map((x) => x.name)
                          .filter((n) =>
                            n === c ? !active : fields.categories.includes(n),
                          ),
                      )
                    }
                    className="flex min-h-11 items-center justify-center gap-2 px-[6px] py-[11px] font-mono text-[11px] font-medium uppercase tracking-[0.08em] lg:flex-1"
                    style={{
                      background: active
                        ? withAlpha(color, 0.12)
                        : "transparent",
                      color: active ? color : "var(--color-sched-text-muted)",
                      borderBottom: `2px solid ${active ? color : "transparent"}`,
                    }}
                  >
                    <span
                      className="block h-2 w-2"
                      style={{
                        background: active
                          ? color
                          : "var(--color-sched-text-muted)",
                      }}
                    />
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {mode === "edit" && !confirmingDelete && (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="border border-[rgba(255,123,84,.35)] px-[14px] py-3 font-mono text-[12px] text-sched-coral lg:hidden"
            >
              Delete event
            </button>
          )}

          {submitError && (
            <p role="alert" className="font-mono text-xs text-sched-coral">
              {submitError}
            </p>
          )}

          {confirmingDelete && (
            <div className="flex flex-wrap items-center gap-4 border border-[rgba(255,123,84,.4)] px-4 py-[14px]">
              <span className="font-mono text-[13px] text-sched-coral">
                Remove &quot;{fields.title || event?.title}&quot;?
              </span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="border border-sched-coral px-[14px] py-[7px] font-mono text-xs font-medium tracking-[0.06em] text-sched-coral disabled:opacity-60"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="px-[2px] py-[7px] font-mono text-xs text-sched-text-muted underline"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-none items-center gap-4 border-t border-sched-hair px-5 pb-[26px] pt-5 lg:border-t-0 lg:px-[30px]">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-sched-accent px-6 py-[13px] font-display text-sm font-semibold tracking-[0.07em] text-sched-fill transition-[filter] hover:brightness-[1.12] disabled:opacity-60 lg:flex-none"
          >
            {mode === "create" ? "SAVE EVENT" : "SAVE CHANGES"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-1 py-3 font-mono text-[13px] text-sched-text-muted underline decoration-1 underline-offset-[3px] transition-colors hover:text-sched-text"
          >
            Cancel
          </button>
          <div className="hidden flex-1 lg:block" />
          {mode === "edit" && (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="hidden px-1 py-3 font-mono text-[13px] text-sched-coral underline decoration-1 underline-offset-[3px] lg:inline"
            >
              Delete event
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
