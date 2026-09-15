import { auth } from "@clerk/nextjs/server";
import { listEvents } from "@/lib/events";
import ScheduleView from "./_components/ScheduleView";

export default async function SchedulePage() {
  const events = await listEvents();

  // Readable signed out, so there may be no session at all. Anonymous
  // visitors get the read-only view: canManage stays false, which is what
  // hides every management control and the API calls behind them.
  const { userId, getToken } = await auth();
  let canManage = false;
  if (userId) {
    const token = await getToken();
    const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const role = meRes.ok ? (await meRes.json()).role : null;
    canManage = role === "exec" || role === "admin";
  }

  return <ScheduleView events={events} canManage={canManage} />;
}
