export type Team = "electrical" | "computer" | "software" | "oldPatrol";

export const TEAMS: { value: Team; label: string }[] = [
  { value: "electrical", label: "Electrical" },
  { value: "computer", label: "Computer" },
  { value: "software", label: "Software" },
  { value: "oldPatrol", label: "Old Patrol" },
];

export function teamLabel(team: Team): string {
  return TEAMS.find((t) => t.value === team)?.label ?? team;
}

// A team's current points award for one event. A team has at most one
// entry per event — awarding again overwrites value/description in place
// (see ScoringPanel) rather than adding a row. awardedAt is the entry's
// latest submission time, not its original award time.
export interface ScoreEntry {
  id: string;
  eventId: string;
  team: Team;
  value: number;
  description: string;
  awardedAt: string;
  cleared: boolean;
}
