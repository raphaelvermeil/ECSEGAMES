export type Team = "electrical" | "computer" | "software";

export const TEAMS: { value: Team; label: string }[] = [
  { value: "electrical", label: "Electrical" },
  { value: "computer", label: "Computer" },
  { value: "software", label: "Software" },
];

export const SEGMENTS = [
  "CS Games comp",
  "Chicken Rush",
  "Captains Challenge",
  "Scunts",
  "Other",
];

export function teamLabel(team: Team): string {
  return TEAMS.find((t) => t.value === team)?.label ?? team;
}

export interface ScoreEntry {
  id: string;
  eventId: string;
  team: Team;
  segment: string;
  value: number;
  description: string;
  awardedBy: string;
  awardedAt: string;
  lastEditedBy: string;
  lastEditedAt: string;
  revoked: boolean;
  revokedBy?: string;
  revokedAt?: string;
}
