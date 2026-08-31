// Meet the team — crew roster. Placeholder people for now; a future
// per-route config file will supply real names, photos, LinkedIn URLs and
// bios without changing this module's shape (CrewId/TeamMember stay the
// same, only PLACEHOLDER_MEMBERS gets replaced by a real data source).

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
  blurb: string;
  linkedinUrl: string;
  // Not populated yet — falls back to initials until the real config lands.
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

const PLACEHOLDER_MEMBERS: TeamMember[] = [
  {
    id: "amara-boucher",
    crew: "co",
    name: "Amara Boucher",
    program: "U4 Software Engineering",
    blurb:
      "Runs the weekend end to end. Ask her about the year the tug-of-war rope snapped.",
    linkedinUrl: "https://www.linkedin.com/",
  },
  {
    id: "ravi-menon",
    crew: "co",
    name: "Ravi Menon",
    program: "U4 Computer Engineering",
    blurb:
      "Keeps budgets, permits and 200 volunteers pointed the same direction.",
    linkedinUrl: "https://www.linkedin.com/",
  },
  {
    id: "talia-nguyen",
    crew: "co",
    name: "Talia Nguyen",
    program: "U3 Software Engineering",
    blurb:
      "Third of the chief trio. Owns sponsor partnerships and the volunteer roster.",
    linkedinUrl: "https://www.linkedin.com/",
  },
  {
    id: "jonas-petit",
    crew: "comms",
    name: "Jonas Petit",
    program: "U2 Electrical Engineering",
    blurb:
      "Photo, video and every caption you screenshot. If you look good in the recap reel, thank him.",
    linkedinUrl: "https://www.linkedin.com/",
  },
  {
    id: "wen-zhao",
    crew: "tech",
    name: "Wen Zhao",
    program: "U4 Software Engineering",
    blurb:
      "Built the live scoreboard. Believes any problem is a caching problem.",
    linkedinUrl: "https://www.linkedin.com/",
  },
  {
    id: "ines-okafor",
    crew: "tech",
    name: "Ines Okafor",
    program: "U3 Computer Engineering",
    blurb: 'Ships the schedule app and fields every "is my score up yet" DM.',
    linkedinUrl: "https://www.linkedin.com/",
  },
  {
    id: "marc-levesque",
    crew: "day",
    name: "Marc Lévesque",
    program: "U3 Electrical Engineering",
    blurb: "Field games, brackets, whistles. Awake before the sun on game day.",
    linkedinUrl: "https://www.linkedin.com/",
  },
  {
    id: "priya-raman",
    crew: "day",
    name: "Priya Raman",
    program: "U2 Software Engineering",
    blurb: "Runs the relay stations and somehow always has extra sunscreen.",
    linkedinUrl: "https://www.linkedin.com/",
  },
  {
    id: "dara-kim",
    crew: "night",
    name: "Dara Kim",
    program: "U4 Electrical Engineering",
    blurb:
      "Sound, lights, and the setlist. Knows exactly when to drop the fog.",
    linkedinUrl: "https://www.linkedin.com/",
  },
  {
    id: "sam-whitfield",
    crew: "night",
    name: "Sam Whitfield",
    program: "U3 Computer Engineering",
    blurb: "Venue logistics and safety plans so the night runs clean.",
    linkedinUrl: "https://www.linkedin.com/",
  },
  {
    id: "nour-haddad",
    crew: "gen",
    name: "Nour Haddad",
    program: "U2 Computer Engineering",
    blurb:
      "Fills every gap: merch drops, sign-in tables, last-minute anything.",
    linkedinUrl: "https://www.linkedin.com/",
  },
  {
    id: "elise-tremblay",
    crew: "gen",
    name: "Élise Tremblay",
    program: "U0 Electrical Engineering",
    blurb: "First-year on the crew, already the fastest scunt-judge we have.",
    linkedinUrl: "https://www.linkedin.com/",
  },
  {
    id: "kofi-mensah",
    crew: "gen",
    name: "Kofi Mensah",
    program: "U3 Software Engineering",
    blurb:
      "Runs the help desk and makes sure every event has a way in for people who do not do loud.",
    linkedinUrl: "https://www.linkedin.com/",
  },
  {
    id: "maya-fournier",
    crew: "ise",
    name: "Maya Fournier",
    program: "U0 Software Engineering",
    blurb:
      "Waste diversion, reusables and the compost brigade. Chasing a zero-landfill weekend.",
    linkedinUrl: "https://www.linkedin.com/",
  },
];

// Async so a future swap to a per-route JSON config (or an API call) doesn't
// change this function's signature.
export async function getTeamMembers(): Promise<TeamMember[]> {
  return PLACEHOLDER_MEMBERS;
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
