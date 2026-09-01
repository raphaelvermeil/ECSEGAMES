// Meet the team — crew roster, sourced from Coords/coords.json (kept
// alongside the app rather than in the database since it's low-frequency,
// person-managed content, not user data). Photos live in public/coords/;
// coords.json is the single source of truth and stores the ready-to-use
// public URL for each.
import coordsData from "../../Coords/coords.json";

export type CrewId = "co" | "comms" | "tech" | "day" | "night" | "gen" | "ise";

export interface Crew {
  id: CrewId;
  name: string;
  role: string;
  color: string;
}

export interface TeamMember {
  id: string;
  crew: CrewId;
  name: string;
  program: string;
  // Not every coord has a bio or a LinkedIn on file yet — both render
  // conditionally rather than falling back to invented copy.
  blurb?: string;
  linkedinUrl?: string;
  // Falls back to initials (see initials()) when unset.
  photoPath?: string;
}

export const CREWS: Crew[] = [
  { id: "co", name: "CO-CHIEF", role: "CO-CHIEF", color: "#ffd166" },
  {
    id: "comms",
    name: "COMMUNICATIONS",
    role: "COMMUNICATIONS COORD",
    color: "#ff7b54",
  },
  { id: "tech", name: "TECH DEV", role: "TECH DEV COORD", color: "#6ee787" },
  {
    id: "day",
    name: "DAY EVENTS",
    role: "DAY EVENTS COORD",
    color: "#7fd1ff",
  },
  {
    id: "night",
    name: "NIGHT EVENTS",
    role: "NIGHT EVENTS COORD",
    color: "#b39cff",
  },
  { id: "gen", name: "GENERAL", role: "GENERAL COORD", color: "#e9f5cd" },
  {
    id: "ise",
    name: "INC & SUS & EQ",
    role: "INC & SUS & EQ COORD",
    color: "#58d6a8",
  },
];

interface CoordRecord {
  id: string;
  name: string;
  program: string;
  crew: CrewId;
  linkedin: string | null;
  photo: string | null;
  blurb: string | null;
}

const MEMBERS: TeamMember[] = (coordsData as CoordRecord[]).map((c) => ({
  id: c.id,
  crew: c.crew,
  name: c.name,
  program: c.program,
  blurb: c.blurb ?? undefined,
  linkedinUrl: c.linkedin ?? undefined,
  photoPath: c.photo ?? undefined,
}));

export async function getTeamMembers(): Promise<TeamMember[]> {
  return MEMBERS;
}

export function crewFor(id: CrewId): Crew {
  return CREWS.find((c) => c.id === id)!;
}

export function initials(name: string): string {
  const [first, second] = name.trim().split(/\s+/);
  return (first[0] + (second?.[0] ?? "")).toUpperCase();
}

export function firstName(name: string): string {
  return name.split(" ")[0];
}

export interface CrewGroup {
  crew: Crew;
  members: TeamMember[];
}

export function groupByCrew(members: TeamMember[]): CrewGroup[] {
  return CREWS.map((crew) => ({
    crew,
    members: members.filter((m) => m.crew === crew.id),
  }));
}
