import { auth } from "@clerk/nextjs/server";
import AppShell from "@/components/AppShell";

// Pages anyone can read, signed in or not. Same chrome as the (app) group,
// but no auth.protect() and no team gate — which also means a signed-in user
// who hasn't picked a team yet can browse these rather than being bounced to
// /select-team.
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  return <AppShell signedIn={Boolean(userId)}>{children}</AppShell>;
}
