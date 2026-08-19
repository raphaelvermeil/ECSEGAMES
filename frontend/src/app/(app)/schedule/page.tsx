import { auth } from "@clerk/nextjs/server";
import { listEvents } from "@/lib/events";
import ScheduleView from "./_components/ScheduleView";

export default async function SchedulePage() {
  await auth.protect();
  const events = await listEvents();

  const { getToken } = await auth();
  const token = await getToken();
  const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const role = meRes.ok ? (await meRes.json()).role : null;
  const canManage = role === "exec" || role === "admin";

  return <ScheduleView events={events} canManage={canManage} />;
}
