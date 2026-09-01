import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Navbar from "./Navbar";
import ViewportFloor from "./ViewportFloor";

// Gate for all real features: the user must be signed in AND have joined a
// program team. If they haven't joined one yet, send them to /select-team.
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
  if (!user.team) {
    redirect("/select-team");
  }

  // Heights are dvh, not vh: on mobile browsers 100vh includes the strip
  // behind the collapsible URL bar, which would leave the shell taller than the
  // visible screen and make the meet-the-team column (h-dvh) scroll by the
  // difference. On desktop the two are identical.
  return (
    <div className="min-h-dvh bg-sched-frame-page">
      {/* The only width clamp is the zoom floor ViewportFloor publishes: the
          shell may grow past the load-time viewport width but never shrink
          below it, so zooming in magnifies the layout and scrolls instead of
          rewrapping the nav and crushing the page. The 0px fallback keeps the
          class inert during SSR and first paint. Deliberately no max-width —
          zooming out should expand to fill. */}
      <div className="mx-auto min-h-dvh w-full overflow-hidden bg-sched-bg lg:min-w-[var(--app-floor-w,0px)]">
        <ViewportFloor />
        <Navbar />
        {children}
      </div>
    </div>
  );
}
