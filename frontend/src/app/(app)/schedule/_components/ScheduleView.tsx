"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pin } from "@/components/icons";
import type { EventCategory, ScheduleEvent } from "@/lib/events";
import {
  CATEGORIES,
  INACTIVE_CHIP_BORDER,
  buildDayBuckets,
  buildRailGroups,
  categoryColor,
  dateKey,
  formatDayLabel,
  formatTime,
  isOngoing,
  withAlpha,
} from "@/lib/schedule";
import EventDetailModal from "./EventDetailModal";
import EventFormModal from "./EventFormModal";
import ScheduleBanner from "./ScheduleBanner";
import UpcomingRail from "./UpcomingRail";

const ALL_ON: Record<EventCategory, boolean> = {
  Competition: true,
  Meals: true,
  Administration: true,
  Custom: true,
};

export default function ScheduleView({
  events,
  canManage,
}: {
  events: ScheduleEvent[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [filters, setFilters] =
    useState<Record<EventCategory, boolean>>(ALL_ON);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [formEvent, setFormEvent] = useState<ScheduleEvent | null>(null);

  const now = useMemo(() => new Date(), []);
  const allFiltered = CATEGORIES.every((c) => filters[c]);
  const filtered = useMemo(
    () => events.filter((e) => filters[e.category]),
    [events, filters],
  );
  const ongoing = useMemo(() => filtered.filter(isOngoing), [filtered]);
  const dayBuckets = useMemo(() => buildDayBuckets(filtered), [filtered]);
  const activeDayKey = selectedDay ?? dayBuckets[0]?.key ?? null;
  const activeBucket = dayBuckets.find((b) => b.key === activeDayKey) ?? null;
  const railGroups = useMemo(
    () => buildRailGroups(filtered, now),
    [filtered, now],
  );
  const railCount = railGroups.reduce((n, g) => n + g.events.length, 0);
  const openEvent = events.find((e) => e.id === openEventId) ?? null;

  function toggleFilter(c: EventCategory) {
    setFilters((f) => ({ ...f, [c]: !f[c] }));
  }
  function clearFilters() {
    setFilters(ALL_ON);
  }

  const railEmptyMessage =
    railGroups.length > 0
      ? null
      : events.length > 0 && !allFiltered
        ? "No events match these filters."
        : "Nothing scheduled yet.";

  function handleSaved(saved: ScheduleEvent) {
    const wasCreate = formMode === "create";
    setFormMode(null);
    setFormEvent(null);
    if (wasCreate && !isOngoing(saved)) {
      setSelectedDay(dateKey(new Date(saved.startsAt)));
    }
    router.refresh();
  }

  function handleDeleted() {
    setFormMode(null);
    setFormEvent(null);
    setOpenEventId(null);
    router.refresh();
  }

  return (
    <>
      <ScheduleBanner
        canManage={canManage}
        onAdd={() => setFormMode("create")}
      />
      <main className="bg-sched-bg px-10 pb-20 pt-[26px]">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2.05fr)_minmax(340px,1fr)]">
          <section className="min-w-0">
            <div
              role="group"
              aria-label="Category filters"
              className="mb-4 flex flex-wrap gap-[10px]"
            >
              {CATEGORIES.map((c) => {
                const active = filters[c];
                const color = categoryColor(c);
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleFilter(c)}
                    className="flex items-center gap-[9px] px-[14px] py-2 font-mono text-xs font-medium uppercase tracking-[0.09em] transition-colors"
                    style={{
                      background: active
                        ? withAlpha(color, 0.12)
                        : "transparent",
                      border: `1px solid ${active ? withAlpha(color, 0.4) : INACTIVE_CHIP_BORDER}`,
                      color: active ? color : "var(--color-sched-text-muted)",
                    }}
                  >
                    <span
                      className="block h-[9px] w-[9px]"
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

            {ongoing.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-[22px] border border-dashed border-sched-hair bg-sched-bg-raised px-[18px] py-[14px]">
                <span className="whitespace-nowrap font-mono text-[10px] font-medium tracking-[0.16em] text-sched-accent-dim">
                  RUNS ALL WEEKEND
                </span>
                <div className="flex flex-wrap gap-[10px]">
                  {ongoing.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setOpenEventId(e.id)}
                      className="flex items-center gap-[10px] border-l-[3px] bg-sched-bg px-[14px] py-[9px] text-left transition-colors hover:bg-[#17251d]"
                      style={{ borderLeftColor: categoryColor(e.category) }}
                    >
                      <span className="font-mono text-[13px] text-sched-cream">
                        {e.title}
                      </span>
                      <span className="font-mono text-[11px] text-sched-text-muted">
                        {e.shortDescription}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-sched-hair bg-sched-bg-raised">
              {dayBuckets.length === 0 ? (
                <EmptyState
                  message={
                    events.length === 0
                      ? "No events scheduled yet."
                      : "No events match these filters."
                  }
                  showClear={events.length > 0 && !allFiltered}
                  onClear={clearFilters}
                />
              ) : (
                <>
                  <div
                    role="tablist"
                    aria-label="Games days"
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${dayBuckets.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {dayBuckets.map((b, i) => {
                      const active = b.key === activeDayKey;
                      return (
                        <button
                          key={b.key}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setSelectedDay(b.key)}
                          className="flex flex-col items-start gap-[7px] border-r border-sched-hair px-5 py-[18px] text-left transition-colors last:border-r-0"
                          style={{
                            background: active
                              ? "var(--color-sched-bg)"
                              : "transparent",
                            borderBottom: `3px solid ${active ? "var(--color-sched-accent)" : "transparent"}`,
                          }}
                        >
                          <span
                            className="font-mono text-[10px] font-medium tracking-[0.18em]"
                            style={{
                              color: active
                                ? "var(--color-sched-accent)"
                                : "var(--color-sched-text-muted)",
                            }}
                          >
                            DAY {i + 1}
                          </span>
                          <span
                            className="font-display text-[26px] font-semibold leading-none tracking-[0.03em]"
                            style={{
                              color: active
                                ? "var(--color-sched-cream)"
                                : "var(--color-sched-text-muted)",
                            }}
                          >
                            {formatDayLabel(b.date)}
                          </span>
                          <span className="font-mono text-[11px] text-sched-text-muted">
                            {b.events.length}{" "}
                            {b.events.length === 1 ? "event" : "events"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div
                    role="tabpanel"
                    className="px-[22px] pb-[26px] pt-[22px]"
                  >
                    {activeBucket && activeBucket.events.length > 0 ? (
                      activeBucket.events.map((e) => {
                        const color = categoryColor(e.category);
                        return (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => setOpenEventId(e.id)}
                            className="sched-day-row mb-3 grid w-full items-start gap-5 bg-sched-bg px-5 py-[18px] text-left"
                            style={
                              {
                                gridTemplateColumns: "96px minmax(0,1fr) auto",
                                borderLeftColor: color,
                                "--row-color": color,
                              } as React.CSSProperties
                            }
                          >
                            <span className="block">
                              <span className="block font-display text-2xl font-semibold leading-none tracking-[0.02em] text-sched-cream">
                                {formatTime(new Date(e.startsAt))}
                              </span>
                              <span className="mt-[7px] block font-mono text-[11px] text-sched-text-muted">
                                until {formatTime(new Date(e.endsAt))}
                              </span>
                            </span>
                            <span className="block min-w-0">
                              <span className="block font-mono text-base text-sched-cream">
                                {e.title}
                              </span>
                              <span className="mt-[7px] block max-w-[60ch] text-pretty font-mono text-[13px] leading-[1.6] text-sched-text-muted">
                                {e.shortDescription}
                              </span>
                              <span className="mt-[11px] flex items-center gap-2 font-mono text-[11px] text-sched-accent-dim">
                                <Pin width={12} height={12} strokeWidth={1.8} />
                                {e.location}
                              </span>
                            </span>
                            <span
                              className="flex items-center gap-[7px] whitespace-nowrap border px-[10px] py-[5px] font-mono text-[10px] font-medium uppercase tracking-[0.11em]"
                              style={{
                                borderColor: withAlpha(color, 0.4),
                                color,
                              }}
                            >
                              <span
                                className="block h-[7px] w-[7px]"
                                style={{ background: color }}
                              />
                              {e.category}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <EmptyState
                        message="No events match these filters."
                        showClear
                        onClear={clearFilters}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </section>

          <UpcomingRail
            groups={railGroups}
            count={railCount}
            emptyMessage={railEmptyMessage}
            canManage={canManage}
            onClearFilters={clearFilters}
            onOpen={(e) => setOpenEventId(e.id)}
            onAdd={() => setFormMode("create")}
          />
        </div>

        {formMode === null && openEvent && (
          <EventDetailModal
            event={openEvent}
            canManage={canManage}
            onClose={() => setOpenEventId(null)}
            onEdit={() => {
              setFormEvent(openEvent);
              setFormMode("edit");
            }}
          />
        )}

        {formMode !== null && (
          <EventFormModal
            mode={formMode}
            event={formMode === "edit" ? formEvent : null}
            onClose={() => {
              setFormMode(null);
              setFormEvent(null);
            }}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        )}
      </main>
    </>
  );
}

function EmptyState({
  message,
  showClear,
  onClear,
}: {
  message: string;
  showClear: boolean;
  onClear: () => void;
}) {
  return (
    <div className="px-[10px] py-[52px] text-center">
      <p className="font-mono text-[13px] text-sched-text-muted">{message}</p>
      {showClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-[14px] border border-sched-hair px-4 py-[9px] font-mono text-xs uppercase tracking-[0.09em] text-sched-accent transition-colors hover:border-sched-accent"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
