import { auth } from "@clerk/nextjs/server";
import { listEvents } from "@/lib/events";
import ScheduleView from "./_components/ScheduleView";

// The schedule is public — anyone can read it, signed in or not. Only the
// exec controls (add/edit/delete, the scoring panel, event history) need an
// account, and those hang off canManage.
export default async function SchedulePage() {
  const { userId, getToken } = await auth();

  // Events are public, so this runs either way. The role lookup only happens
  // for a signed-in visitor: there is no point asking /api/me who a
  // signed-out reader is, and the endpoint would 401 anyway.
  const [events, role] = await Promise.all([listEvents(), roleFor(userId, getToken)]);

  const canManage = role === "exec" || role === "admin";

  return <ScheduleView events={events} canManage={canManage} />;
}

// roleFor resolves the caller's role, or null if they aren't signed in or
// the lookup fails. A failure here only costs the exec buttons, so it
// degrades to "read-only visitor" rather than breaking the page.
async function roleFor(
  userId: string | null,
  getToken: () => Promise<string | null>,
): Promise<string | null> {
  if (!userId) return null;
  try {
    const token = await getToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()).role ?? null;
  } catch {
    return null;
  }
}
