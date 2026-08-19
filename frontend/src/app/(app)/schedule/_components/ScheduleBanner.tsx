import { UserButton } from "@clerk/nextjs";
import { Bell } from "@/components/icons";

export default function ScheduleBanner({
  canManage,
  onAdd,
  dateRangeLabel,
}: {
  canManage: boolean;
  onAdd: () => void;
  dateRangeLabel?: string;
}) {
  return (
    <div className="relative flex items-center bg-sched-band px-5 pb-4 pt-5 lg:min-h-[180px] lg:px-10 lg:py-9">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.28]"
        style={{
          background:
            "repeating-linear-gradient(to bottom, rgba(0,0,0,.5) 0 1px, transparent 1px 3px)",
        }}
      />
      <div className="relative w-full">
        {/* Mobile only — the shared Navbar is hidden on this route below
            lg, so its logo/bell/account row lives here instead, merged
            into the green band the way the mockup does it. */}
        <div className="mb-[18px] flex items-center justify-between gap-3 lg:hidden">
          <div className="flex items-center gap-[9px]">
            <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-sched-accent-dim font-mono text-[7px] font-semibold tracking-[0.05em] text-sched-accent-dim">
              ECSE
            </div>
            <span className="font-display text-[15px] font-semibold tracking-[0.2em] text-sched-cream">
              GAMES
            </span>
          </div>
          <div className="flex items-center gap-[6px]">
            <button
              type="button"
              aria-label="Notifications"
              className="flex h-11 w-11 items-center justify-center text-sched-accent"
            >
              <Bell width={21} height={21} strokeWidth={1.6} />
            </button>
            <UserButton />
          </div>
        </div>

        <div className="lg:flex lg:flex-1 lg:items-center lg:justify-between lg:gap-10">
          <div>
            <h1 className="font-display text-[40px] font-semibold leading-none tracking-[0.01em] text-sched-cream lg:text-[56px]">
              SCHEDULE
            </h1>
            <p className="mt-[9px] font-mono text-xs text-sched-accent lg:hidden">
              {dateRangeLabel ?? "Everything happening at the Games."}
            </p>
            <p className="mt-[14px] hidden font-mono text-[15px] text-sched-accent lg:block">
              Everything happening at the Games.
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={onAdd}
              className="hidden bg-sched-accent px-[22px] py-[14px] font-display text-[15px] font-semibold tracking-[0.06em] text-sched-fill transition-[filter] hover:brightness-[1.12] lg:inline-flex"
            >
              + ADD EVENT
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
