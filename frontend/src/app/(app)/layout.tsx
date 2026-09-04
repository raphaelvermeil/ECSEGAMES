import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Navbar from "./Navbar";
import ViewportFloor from "./ViewportFloor";

// Gate for all real features: the user must be signed in AND have completed
// onboarding (team + name + major). If any of that is missing — including a
// team that was assigned before name/major existed, or a submission that
// failed partway — send them back to /select-team to finish it.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await auth.protect();

  const { getToken } = await auth();
  const token = await getToken();

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  // If we can't confirm a team (error or none set), route to team selection.
  if (!res.ok) {
    redirect("/select-team");
  }
  const user = await res.json();
  if (!user.team || !user.name || !user.major) {
    redirect("/select-team");
  }

  // --app-vvh is the measured phone viewport height ViewportFloor publishes;
  // TeamView's own height rule reads the same variable, so the shell can't end
  // up taller than the page content and leave a strip of its own background
  // showing below. 100svh is the pre-JS fallback: svh (not vh) because 100vh
  // includes the strip behind a mobile browser's collapsible URL bar. On
  // desktop the variable is unset and svh/dvh/vh are all identical, so this
  // resolves to exactly what it always was.
  return (
    <div className="min-h-[min(var(--app-vvh,100svh),100svh)] bg-sched-frame-page">
      {/* The only width clamp is the zoom floor ViewportFloor publishes: the
          shell may grow past the load-time viewport width but never shrink
          below it, so zooming in magnifies the layout and scrolls instead of
          rewrapping the nav and crushing the page. The 0px fallback keeps the
          class inert during SSR and first paint. Deliberately no max-width —
          zooming out should expand to fill. */}
      <div className="mx-auto min-h-[min(var(--app-vvh,100svh),100svh)] w-full overflow-hidden bg-sched-bg lg:min-w-[var(--app-floor-w,0px)]">
        <ViewportFloor />
        <Navbar />
        {children}
      </div>
    </div>
  );
}
