# Team Selection (Join + Lock + Gate) — Design

*Owner:* Raph · *Status:* Approved · *Date:* 2026-07-28

## Purpose

After account creation, prompt the student to join one of three **program teams**
(Electrical / Computer / Software). The choice is **locked** once made, and **all
features are gated** until the user has joined a team.

## Scope

**In scope:** join a program team, set-once lock, gate all features until joined.

**Out of scope (deferred):** changing teams / the exec-approved change-request flow;
sub-teams (the ~5-person per-competition teams).

## Decisions

- **Single source of truth = MongoDB.** The team lives on the `users` document. No
  Clerk `publicMetadata` mirror (avoids sync + session-refresh complexity).
- **Gating via a backend check**, not middleware/session.
- **Set-once lock**: the join endpoint writes `team` only when currently unset.
- **Webhook-race safety net**: `GET /api/me` does get-or-create so an authenticated
  user always has a record even if the `user.created` webhook hasn't landed yet.
- Team values are lowercase slugs: `electrical` | `computer` | `software`.

## Data model

Add to the Mongo `User` (`internal/models/user.go`):

| Field | Type | Notes |
|-------|------|-------|
| `team` | string | `""` unset, else one of the three slugs |

`Team` type + constants (`TeamElectrical`, `TeamComputer`, `TeamSoftware`), plus an
`IsValidTeam(string) bool` helper.

## Backend (Go)

- `internal/users/repository.go`
  - `GetOrCreate(ctx, clerkID) (*models.User, error)` — `FindOneAndUpdate` with
    **`$setOnInsert` only** (`clerkId`, `role: student`, `team: ""`, `email: ""`,
    `createdAt`) and `ReturnDocument: After`. Inserts a minimal record if missing,
    otherwise returns the existing one **untouched** — so it never clobbers the email
    the webhook set. (The webhook's `Upsert` keeps `$set: {email}` as the authoritative
    email source; the two are complementary.)
  - `SetTeam(ctx, clerkID, team) (bool, error)` — updates `team` only if currently
    empty (filter `{clerkId, team: ""}`); returns `false` if nothing matched because it
    was already set (→ caller responds `409`).
- `internal/handlers` (extend/replace the inline `/api/me`)
  - `GET /api/me` — get-or-create the user (upsert if missing), return the full user
    (`clerkId`, `email`, `role`, `team`) as JSON.
  - `POST /api/team` — body `{ "team": "<slug>" }`. Validate slug (`400` if invalid);
    call `SetTeam` (`409` if already set); return the updated user.
  - Both live in the authenticated group (Clerk JWT middleware).
- Handlers need the users repository + the user's email (from `/api/me` get-or-create,
  email comes from… the token has only the subject/userID). For get-or-create on
  `/api/me`, email may be unknown from the JWT alone; store `email: ""` if unknown and
  let the webhook fill it — the webhook remains the authoritative source of email.

## Frontend (Next.js)

- **`/select-team`** (`src/app/select-team/page.tsx`) — client page, three team cards;
  on pick, `POST /api/team` with the Clerk token attached, then `router.push('/')`.
  Signed-in only (`auth.protect()`), but NOT team-gated.
- **`(app)` route group** — move `src/app/page.tsx` → `src/app/(app)/page.tsx`; add
  `src/app/(app)/layout.tsx` (server component) that fetches `/api/me` with the Clerk
  token (`auth().getToken()`); if `team` is empty → `redirect('/select-team')`.
- **Token attachment** — per call, not a global interceptor: client uses
  `useAuth().getToken()`; server uses `await auth()` → `getToken()`. Base URL from
  `NEXT_PUBLIC_API_URL` (existing `src/lib/api.ts`).

## Error handling

| Case | Response |
|------|----------|
| Invalid team slug | `400` |
| Team already set | `409` (locked — change needs exec approval, deferred) |
| Backend unreachable | error surfaced on `/select-team` |

## Verification

- New signup → redirected to `/select-team` → pick a team → land on home.
- Reload → still has access (team persisted in Mongo).
- Direct hit to `/` without a team → redirected to `/select-team`.
- Confirm the `team` field on the user document in Atlas.
- Second `POST /api/team` → `409` (lock holds).
