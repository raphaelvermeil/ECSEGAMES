import { auth } from "@clerk/nextjs/server";
import api from "@/lib/api";

export type EventCategory =
  | "Competition"
  | "Meals"
  | "Administration"
  | "Custom";

export interface ScheduleEvent {
  id: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  access: string;
  captain: string;
  startsAt: string;
  endsAt: string;
  location: string;
  category: EventCategory;
  createdAt: string;
}

// Fetches every event for the Schedule tab (day tabs, the upcoming rail, and
// the ongoing strip all derive their own slices from this one list client-side).
// Returns [] if the backend is unreachable (e.g. not running yet) so the page
// can still render.
export async function listEvents(): Promise<ScheduleEvent[]> {
  try {
    const { getToken } = await auth();
    const token = await getToken();
    const res = await api.get<ScheduleEvent[]>("/api/events", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  } catch {
    return [];
  }
}
