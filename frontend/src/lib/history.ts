export type AuditVerb = "created" | "edited" | "awarded" | "deleted";

export interface AuditDiff {
  label: string;
  from: string;
  to: string;
}

export interface AuditEntry {
  id: string;
  eventId: string;
  entityType: "event" | "scoreEntry";
  entityId: string;
  verb: AuditVerb;
  actor: string;
  at: string;
  text: string;
  diffs?: AuditDiff[];
}

// Matches the design handoff's verb → colour mapping: awarded reads as a
// positive action, deleted (which also covers score revokes) as negative,
// created/edited as neutral.
export function verbColor(verb: AuditVerb): string {
  switch (verb) {
    case "awarded":
      return "var(--color-sched-accent)";
    case "deleted":
      return "var(--color-sched-coral)";
    default:
      return "var(--color-sched-accent-dim)";
  }
}
