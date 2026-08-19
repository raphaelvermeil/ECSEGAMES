export default function ScheduleBanner({
  canManage,
  onAdd,
}: {
  canManage: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="relative flex min-h-[180px] items-center bg-sched-band px-10 py-9">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.28]"
        style={{
          background:
            "repeating-linear-gradient(to bottom, rgba(0,0,0,.5) 0 1px, transparent 1px 3px)",
        }}
      />
      <div className="relative flex flex-1 items-center justify-between gap-10">
        <div>
          <h1 className="font-display text-[56px] font-semibold leading-none tracking-[0.01em] text-sched-cream">
            SCHEDULE
          </h1>
          <p className="mt-[14px] font-mono text-[15px] text-sched-accent">
            Everything happening at the Games.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={onAdd}
            className="bg-sched-accent px-[22px] py-[14px] font-display text-[15px] font-semibold tracking-[0.06em] text-sched-fill transition-[filter] hover:brightness-[1.12]"
          >
            + ADD EVENT
          </button>
        )}
      </div>
    </div>
  );
}
