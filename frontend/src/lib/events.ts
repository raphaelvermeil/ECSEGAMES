import api from "@/lib/api";

// Execs create and delete categories; events refer to them by name.
export interface EventCategory {
  id: string;
  name: string;
  color: string; // "#rrggbb"
}

// Scoring hangs off this category, so the backend won't let it be deleted.
export const COMPETITION = "Competition";

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
  categories: string[];
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

// Fetches every category, oldest first. Public like listEvents, and returns
// [] on failure for the same reason.
export async function listCategories(): Promise<EventCategory[]> {
  try {
    const res = await api.get<EventCategory[]>("/api/categories");
    return res.data;
  } catch {
    return [];
  }
}
