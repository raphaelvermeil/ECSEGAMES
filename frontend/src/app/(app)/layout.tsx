import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Navbar from "./Navbar";

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

  return (
    <div className="min-h-screen bg-sched-frame-page px-2 pt-2">
      <div className="mx-auto min-w-[1380px] max-w-[2500px] overflow-hidden rounded-t-[14px] bg-sched-bg">
        <Navbar />
        {children}
      </div>
    </div>
  );
}
