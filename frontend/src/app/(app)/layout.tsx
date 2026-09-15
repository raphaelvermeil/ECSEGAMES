import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";

// Gate for the members-only features: the user must be signed in AND have
// joined a program team. If they haven't joined one yet, send them to
// /select-team. Pages reachable without a session live in the (public)
// group instead — they share this shell but skip both checks.
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

  return <AppShell signedIn>{children}</AppShell>;
}
