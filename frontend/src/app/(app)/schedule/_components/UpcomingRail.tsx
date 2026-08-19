import type { ScheduleEvent } from "@/lib/events";
import type { RailGroup } from "@/lib/schedule";
import { categoryColor, formatTime, withAlpha } from "@/lib/schedule";

export default function UpcomingRail({
  groups,
  count,
  emptyMessage,
  canManage,
  onClearFilters,
  onOpen,
  onAdd,
}: {
  groups: RailGroup[];
  count: number;
  emptyMessage: string | null;
  canManage: boolean;
  onClearFilters: () => void;
  onOpen: (event: ScheduleEvent) => void;
  onAdd: () => void;
}) {
  return (
    <aside className="min-w-0 border border-sched-hair bg-sched-bg-raised">
      <div className="flex items-baseline justify-between border-b border-sched-hair px-[18px] py-4">
        <h2 className="font-display text-lg font-semibold tracking-[0.08em] text-sched-cream">
          UPCOMING
        </h2>
        <span className="font-mono text-[11px] tracking-[0.09em] text-sched-text-muted">
          {count} {count === 1 ? "EVENT" : "EVENTS"}
        </span>
      </div>
      <div className="max-h-[860px] overflow-y-auto overflow-x-hidden">
        {groups.map((g) => (
          <div key={g.key}>
            <div className="sticky top-0 z-[2] border-b border-sched-hair bg-sched-bg-raised px-[18px] pb-2 pt-3 font-mono text-[11px] font-medium tracking-[0.16em] text-sched-accent-dim">
              {g.label}
            </div>
            {g.events.map((e) => {
              const color = categoryColor(e.category);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onOpen(e)}
                  className="sched-rail-row grid w-full items-start gap-[14px] border-b px-[18px] py-[14px] text-left"
                  style={
                    {
                      gridTemplateColumns: "62px minmax(0,1fr) auto",
                      borderBottomColor: "rgba(63,143,87,.18)",
                      "--row-color": color,
                    } as React.CSSProperties
                  }
                >
                  <span className="font-display text-[17px] font-medium tracking-[0.03em] text-sched-cream">
                    {formatTime(new Date(e.startsAt))}
                  </span>
                  <span className="block min-w-0">
                    <span className="block font-mono text-sm leading-[1.35] text-sched-cream">
                      {e.title}
                    </span>
                    <span className="mt-[5px] block text-pretty font-mono text-xs leading-[1.5] text-sched-text-muted">
                      {e.shortDescription}
                    </span>
                  </span>
                  <span
                    className="flex items-center gap-[7px] whitespace-nowrap border px-[9px] py-1 font-mono text-[10px] font-medium uppercase tracking-[0.1em]"
                    style={{ borderColor: withAlpha(color, 0.4), color }}
                  >
                    <span
                      className="block h-[7px] w-[7px]"
                      style={{ background: color }}
                    />
                    {e.category}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
        {emptyMessage && (
          <div className="px-[18px] py-11 text-center">
            <p className="font-mono text-[13px] text-sched-text-muted">
              {emptyMessage}
            </p>
            {emptyMessage === "No events match these filters." && (
              <button
                type="button"
                onClick={onClearFilters}
                className="mt-[14px] border border-sched-hair px-4 py-[9px] font-mono text-xs uppercase tracking-[0.09em] text-sched-accent transition-colors hover:border-sched-accent"
              >
                Clear filters
              </button>
            )}
            {emptyMessage === "Nothing scheduled yet." && canManage && (
              <button
                type="button"
                onClick={onAdd}
                className="mt-[14px] bg-sched-accent px-[18px] py-[10px] font-display text-xs font-semibold tracking-[0.08em] text-sched-fill transition-[filter] hover:brightness-[1.12]"
              >
                + ADD EVENT
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
