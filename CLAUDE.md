# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working principles

- **Simplest possible implementation, always.** Prefer the most straightforward solution that works. No speculative abstraction, no gold-plating.
- **Robust, but simple first.** The simple version must still be correct and reliable — simple does not mean fragile.
- **Ask before implementing edge cases.** Build the core happy path, then stop and ask before adding handling for edge cases, error branches, or extra scenarios.
- **Least amount of changes possible.** Make the smallest diff that accomplishes the task. Don't refactor, rename, or touch unrelated code unless asked.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Project overview

ECSESS Games: students register with a McGill email, join one of four teams
(Electrical, Computer, Software, Old Patrol), and earn points in competitions run by execs. A Go backend
and Next.js frontend live side by side in this monorepo. See [README.md](README.md) for a
from-scratch explanation of every technology used, and [DEPLOYMENT.md](DEPLOYMENT.md) for what
is currently dev-only and must change before production.

No test suite exists yet in either backend or frontend (no `*_test.go` files, no JS test
runner configured) — don't invent test commands.

## Commands

**Backend** (from `backend/`):
```bash
air                          # dev server with auto-reload, http://localhost:8082 (uses backend/.air.toml)
go run ./cmd/api              # plain run, no auto-reload
go build -o api ./cmd/api     # production build
go run ./cmd/seed             # replace seeded fake events (requires MONGO_URI)
go vet ./...                  # static check
gofmt -l .                    # list files needing formatting
```

**Frontend** (from `frontend/`):
```bash
npm run dev                   # dev server, http://localhost:3000
npm run build                 # production build
npm start                     # serve production build
npm run lint                  # ESLint
npm run format                # Prettier --write
npm run format:check          # Prettier --check
```

Health check: `curl localhost:8082/health`.

## Architecture

### Split and request flow

Frontend (Next.js, browser) → HTTP via a shared axios instance
([frontend/src/lib/api.ts](frontend/src/lib/api.ts)) → Backend (Go + chi, `localhost:8082`) →
MongoDB. Auth is handled by Clerk on both sides: the frontend attaches a Clerk session JWT,
the backend's `RequireAuth` middleware verifies it and puts the Clerk user ID in the request
context. The frontend must never hold secrets or enforce rules — the backend is the only thing
that talks to MongoDB and the only place authorization is enforced.

MongoDB is optional at boot ([backend/cmd/api/main.go](backend/cmd/api/main.go)): if
`MONGO_URI` is unset, the server starts with just `/health` and `/ready` — the Clerk webhook
and all data routes (`users`, `events`, `scores`) are not mounted at all.

### Backend layout (`backend/`)

Standard Go layout: `cmd/` holds entry points, `internal/` holds private packages.
- `cmd/api/main.go` — wires everything together: loads config, connects Mongo, builds the chi
  router, mounts route groups, listens on `cfg.Port`.
- `cmd/seed/main.go` — populates the `events` collection with fake data for local testing
  (`go run ./cmd/seed`); tags its documents so reruns replace rather than duplicate.
- `internal/config` — reads all settings from env vars (via `.env` + godotenv) into one struct.
- `internal/db` — opens/pings the Mongo connection.
- `internal/middleware` — `RequireAuth` (Clerk JWT verification, populates user ID in context)
  and `RequireRole` (RBAC gate — see below). `RequireRole` must run after `RequireAuth`.
- `internal/models` — shared domain types (`User`, `Role`, `Team`).
- `internal/users` — user repository (`GetOrCreate` upserts a user from a Clerk ID).
- `internal/handlers` — `/health`, `/ready`, the Clerk webhook (`user.created` → upserts a
  `User`, verified by Svix signature rather than the JWT middleware), `/api/me`, `/api/team`.
- `internal/events`, `internal/scores` — each is a self-contained feature module: `store.go`
  (Mongo access), `events.go`/`scores.go` (domain types), `routes.go` (handler + `Mount(r, ...)`
  that registers its own route group with its own auth/RBAC requirements). New backend features
  should generally follow this same store/domain/routes module shape.
- `internal/audit` — a generic audit-trail store (`audit.Store.Record`/`ListByEvent`) used by
  both `events` and `scores` to log create/edit/delete actions with before/after diffs. An
  event's `/history` endpoint merges its own audit entries with those of its score entries.

**Role-based access (RBAC):** three roles, ranked `admin > exec > student`
([internal/models/user.go](backend/internal/models/user.go)). `RequireRole(repo, minimum)`
looks up the caller's role and rejects (403) if it ranks below `minimum`. Current policy:
event reads require any authenticated user; event writes and the entire scores surface
(reads included) require `RoleExec` or above — event history is intentionally readable by
anyone who can read the event, since it's a historical record, not the live scoring panel.

### Frontend layout (`frontend/src/`)

Next.js 16 App Router — folders under `app/` are URL routes.
- `app/(app)/` — the authenticated app shell, grouped behind `layout.tsx` +
  `Navbar.tsx`. Pages: `schedule`, `leaderboard`, `events`, `cs-comp`, `sponsors`,
  `meet-the-team`.
- `app/(app)/schedule/_components/` — the schedule feature's components (event list/detail
  modals, scoring panel, history view); `_` prefix keeps the folder out of routing.
- `app/select-team/`, `app/sign-in/`, `app/sign-up/` — onboarding/auth pages outside the app
  shell (Clerk-hosted sign-in/up via catch-all `[[...sign-in]]` routes).
- `layout.tsx` (root) — hosts `<ClerkProvider>` so auth state is available everywhere.
- `proxy.ts` — Next 16's renamed `middleware.ts`; runs before pages render to enforce Clerk
  route protection. If you're looking for "the middleware file," this is it.
- `lib/` — one file per domain concern talking to the backend or holding shared logic/constants
  (`api.ts` axios instance, `events.ts`, `scores.ts`, `schedule.ts`, `history.ts`, `nav.ts`).

> **Next.js 16 caveat:** this is a very new major version with breaking changes from what
> training data or tutorials assume — most notably `middleware.ts` → `proxy.ts`. Check
> `frontend/node_modules/next/dist/docs/` for current behavior before assuming an older API.

Tailwind v4 is configured in CSS (`@import "tailwindcss";` in `globals.css` +
`postcss.config.mjs`), not a JS config file — there is no `tailwind.config.js`.

### Design mockups

`frontend/MockupUI/` and `design_handoff_games_schedule/` hold `.dc.html` design-canvas
mockups and handoff notes for the schedule UI — reference for intended visual design, not
part of the running app.
