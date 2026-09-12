import api from "@/lib/api";

// Client for the CS comp backend (backend/internal/cscomp). Every call is
// authenticated, so each takes the Clerk token the caller already has —
// the shared axios instance has no Clerk interceptor, matching how
// ScoringPanel and the rest of the app pass theirs.

export interface Challenge {
  id: string;
  name: string;
  level: number;
  part: number;
  points: number;
  starterCode: string;
  createdAt: string;
}

// A backend user on a comp roster. Mirrors models.User — `major` is the
// program shown under a name on the roster cards.
export interface CompUser {
  clerkId: string;
  name: string;
  major: string;
  team: string;
  role: "student" | "exec" | "admin";
  csCompTeamId: string | null;
}

// Whoever may drive the comp clock. Mirrors the RequireRole(RoleExec) gate
// on POST /api/cscomp/clock — admins outrank execs, so both pass.
export function canControlClock(user: CompUser | null | undefined): boolean {
  return user?.role === "exec" || user?.role === "admin";
}

export interface CompTeam {
  id: string;
  name: string;
  createdAt: string;
  members: CompUser[];
  memberCount: number;
}

export interface Claim {
  id: string;
  teamId: string;
  challengeId: string;
  clerkId: string;
  name: string;
  level: number;
  claimedAt: string;
}

// One person's best attempt at one challenge. matchPercent and code always
// describe the best attempt, not the latest — see cscomp.Submission.
export interface Submission {
  id: string;
  challengeId: string;
  clerkId: string;
  teamId: string;
  name: string;
  code: string;
  matchPercent: number;
  attempts: number;
  submittedAt: string;
}

export interface MeView {
  user: CompUser;
  team: CompTeam | null;
  claims: Claim[];
  submissions: Submission[];
}

export interface Standing {
  teamId: string;
  name: string;
  points: number;
  solved: number;
  memberCount: number;
  // "<level>-<part>" keys, the same shape as partKey().
  solvedParts: string[];
  lastLevel: number;
}

export interface Leaderboard {
  standings: Standing[];
  total: number;
  totalParts: number;
}

// The shared comp countdown. remainingSeconds is resolved server-side, so
// the page counts down locally from it and re-syncs on the next poll
// instead of reasoning about clock skew.
export interface ClockView {
  status: "stopped" | "running" | "paused";
  remainingSeconds: number;
  durationSeconds: number;
  updatedBy: string;
}

export type ClockAction = "start" | "pause" | "stop" | "adjust";

export interface SubmitResult {
  matchPercent: number;
  best: number;
  attempts: number;
  solved: boolean;
  points: number;
}

// The match percentage at or above which a challenge counts as solved.
// Mirrors cscomp.PassThreshold — the server is what actually decides, this
// is only so the editor can phrase a near miss.
export const PASS_THRESHOLD = 98;

// How often the standings re-poll. Submissions land far apart even at full
// tilt — a team of five writing CSS by hand is not a per-second event —
// and the board says "updating every submission", not every frame.
export const STANDINGS_POLL_MS = 15_000;

// The clock re-syncs far more often than the standings: an exec pausing
// the round is something every screen in the room should reflect within a
// few seconds, and the payload is four small fields.
export const CLOCK_POLL_MS = 5_000;

type Token = string | null;

function auth(token: Token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export async function listChallenges(token: Token): Promise<Challenge[]> {
  const res = await api.get<Challenge[]>("/api/cscomp/challenges", auth(token));
  return res.data;
}

export async function listTeams(token: Token): Promise<CompTeam[]> {
  const res = await api.get<CompTeam[]>("/api/cscomp/teams", auth(token));
  return res.data;
}

export async function fetchMe(token: Token): Promise<MeView> {
  const res = await api.get<MeView>("/api/cscomp/me", auth(token));
  return res.data;
}

export async function fetchStandings(token: Token): Promise<Leaderboard> {
  const res = await api.get<Leaderboard>(
    "/api/cscomp/leaderboard",
    auth(token),
  );
  return res.data;
}

export async function createTeam(
  token: Token,
  name: string,
): Promise<CompTeam> {
  const res = await api.post<CompTeam>(
    "/api/cscomp/teams",
    { name },
    auth(token),
  );
  return res.data;
}

export async function joinTeam(token: Token, id: string): Promise<CompTeam> {
  const res = await api.post<CompTeam>(
    `/api/cscomp/teams/${id}/join`,
    null,
    auth(token),
  );
  return res.data;
}

export async function leaveTeam(token: Token, id: string): Promise<void> {
  await api.post(`/api/cscomp/teams/${id}/leave`, null, auth(token));
}

export async function claimChallenge(token: Token, id: string): Promise<Claim> {
  const res = await api.post<Claim>(
    `/api/cscomp/challenges/${id}/claim`,
    null,
    auth(token),
  );
  return res.data;
}

export async function unclaimChallenge(
  token: Token,
  id: string,
): Promise<void> {
  await api.delete(`/api/cscomp/challenges/${id}/claim`, auth(token));
}

export async function submitCode(
  token: Token,
  id: string,
  code: string,
): Promise<SubmitResult> {
  const res = await api.post<SubmitResult>(
    `/api/cscomp/challenges/${id}/submit`,
    { code },
    auth(token),
  );
  return res.data;
}

// The target image sits behind RequireAuth like everything else, so it
// cannot be an <img src> — the browser would send no token. Fetch it with
// the header and hand back an object URL the caller is responsible for
// revoking.
export async function fetchTargetURL(
  token: Token,
  id: string,
): Promise<string> {
  const res = await api.get<Blob>(`/api/cscomp/challenges/${id}/target.png`, {
    ...auth(token),
    responseType: "blob",
  });
  return URL.createObjectURL(res.data);
}

export async function fetchClock(token: Token): Promise<ClockView> {
  const res = await api.get<ClockView>("/api/cscomp/clock", auth(token));
  return res.data;
}

// Exec-only. `seconds` is read for "adjust" alone, and is signed: positive
// adds time, negative takes it away.
export async function controlClock(
  token: Token,
  action: ClockAction,
  seconds = 0,
): Promise<ClockView> {
  const res = await api.post<ClockView>(
    "/api/cscomp/clock",
    { action, seconds },
    auth(token),
  );
  return res.data;
}
