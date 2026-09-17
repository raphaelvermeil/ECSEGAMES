import type { Claim, CompUser } from "@/lib/cscomp-api";

// CS comp — in-house CSS battle. Teams of 5 recreate a target scene in a
// single HTML+CSS file, one part per teammate.
//
// Everything with a right answer — the challenges, their starter code,
// their target images, who is on which team, what is claimed and what is
// solved — comes from the backend (see lib/cscomp-api.ts). What lives here
// is the presentation metadata the backend has no opinion about: level
// accent colours, the one-line note on each level, and the roster styling
// the panels share.

export const TEAM_SIZE = 5;

// Per-level display metadata, keyed by level number. The names mirror
// backend/cmd/seedcscomp/levels.go; the colours and notes are ours. Look a
// level up through levelMeta() so a challenge seeded outside this range
// still renders instead of throwing.
export interface LevelMeta {
  n: number;
  name: string;
  color: string;
  note: string;
}

export const LEVEL_META: LevelMeta[] = [
  {
    n: 1,
    name: "WARM UP",
    color: "#6ee787",
    note: "Flat blocks only — position, size, colour.",
  },
  {
    n: 2,
    name: "FIELD DAY",
    color: "#4cc9f0",
    note: "Five or six blocks — stacking and border-radius.",
  },
  {
    n: 3,
    name: "GOLDEN HOUR",
    color: "#ffd166",
    note: "Seven blocks — clip-path triangles and rotation.",
  },
  {
    n: 4,
    name: "SCUNTS",
    color: "#c792ea",
    note: "Nine or ten blocks — borders, overlap, transforms.",
  },
  {
    n: 5,
    name: "FINAL BOSS",
    color: "#ff7b54",
    note: "Eleven blocks and up — full scenes, shadows, layering.",
  },
  {
    n: 6,
    name: "THE LANDSCAPE",
    color: "#58d6a8",
    note: "One whole scene, fifteen blocks and up. No shortcuts.",
  },
  {
    n: 7,
    name: "ASSEMBLY LINE",
    color: "#f48fb1",
    note: "Flexbox. Paste the children, then count them with :nth-child.",
  },
  {
    n: 8,
    name: "THE LONG VIEW",
    color: "#e9f5cd",
    note: "Landscapes built out of repeats. Bands of rows, nested.",
  },
];

const UNKNOWN_LEVEL: LevelMeta = {
  n: 0,
  name: "LEVEL",
  color: "#7f9482",
  note: "",
};

export function levelMeta(n: number): LevelMeta {
  return LEVEL_META.find((l) => l.n === n) ?? { ...UNKNOWN_LEVEL, n };
}

// Sub-team accent colours. The backend stores no colour for a team — it
// has no reason to — so one is assigned by the team's position in a stable
// ordering (see teamColors), which keeps a team the same colour across
// every panel and every reload.
export const TEAM_PALETTE = [
  "#6ee787",
  "#7fd1ff",
  "#ffd166",
  "#c792ea",
  "#ff7b54",
  "#58d6a8",
];

// Maps team id -> colour. Ordering is by id rather than by whatever order
// the API returned, so the assignment does not shift when a team is
// created or a roster changes.
export function teamColors(ids: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  [...ids]
    .sort()
    .forEach((id, i) => (out[id] = TEAM_PALETTE[i % TEAM_PALETTE.length]));
  return out;
}

export function partKey(level: number, part: number): string {
  return `${level}-${part}`;
}

export function formatClock(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export interface CompSlot {
  key: string;
  initials: string;
  name: string;
  program: string;
  ring: string;
  fill: string;
  ink: string;
  nameInk: string;
  tag: string;
  tagInk: string;
  open: boolean;
}

// Pads a roster out to TEAM_SIZE with "Open slot" placeholders and styles
// the signed-in user's row. The tag is what that teammate currently has
// claimed, so a roster doubles as the team's split of the work — claims
// are team-wide, which is why one person's view can label everyone.
export function slots(
  members: CompUser[],
  meClerkId: string,
  color: string,
  claims: Claim[],
  challengeLabel: (challengeId: string) => string,
): CompSlot[] {
  const claimByMember: Record<string, Claim> = {};
  for (const c of claims) {
    // A person holds one claim per level, so the highest level they are on
    // is the one worth showing.
    const held = claimByMember[c.clerkId];
    if (!held || c.level > held.level) claimByMember[c.clerkId] = c;
  }

  const out: CompSlot[] = members.map((m) => {
    const isYou = m.clerkId === meClerkId;
    const claim = claimByMember[m.clerkId];
    const label = claim ? challengeLabel(claim.challengeId) : "NO CLAIM";
    return {
      key: m.clerkId,
      initials: initialsOf(m.name),
      name: m.name,
      program: m.major,
      ring: isYou ? "#6ee787" : color,
      fill: "#16241c",
      ink: isYou ? "#6ee787" : color,
      nameInk: isYou ? "#e9f5cd" : "#c6d6c0",
      tag: isYou ? `YOU · ${label}` : label,
      tagInk: isYou ? "#6ee787" : "#7f9482",
      open: false,
    };
  });

  while (out.length < TEAM_SIZE) {
    out.push({
      key: `open-${out.length}`,
      initials: "—",
      name: "Open slot",
      program: "waiting for a coder",
      ring: "rgba(63,143,87,.3)",
      fill: "transparent",
      ink: "#4d6455",
      nameInk: "#5f7566",
      tag: "OPEN",
      tagInk: "#7f9482",
      open: true,
    });
  }
  return out;
}
