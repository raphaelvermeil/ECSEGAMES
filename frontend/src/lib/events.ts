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
//
// No auth header: GET /api/events is public, so the schedule renders the same
// for a signed-out visitor as for a logged-in student. Dropping the token also
// keeps auth() out of this module, which matters — calling it here would opt
// every page that imports this into per-request rendering.
export async function listEvents(): Promise<ScheduleEvent[]> {
  try {
    const res = await api.get<ScheduleEvent[]>("/api/events");
    return res.data;
  } catch {
    return [];
  }
}
