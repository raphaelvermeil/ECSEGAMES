# ECSESS Games — Project Foundation (Scaffolding) Design

*Owner:* Raph · *Status:* Approved · *Date:* 2026-07-24

## Purpose

Stand up the project foundations only: directory structure, dependency
initialization, and bare-minimum connection code / middleware. No domain logic,
no live-service wiring. This is the first task of the project's "First Step"
(Project Initialization). Everything domain-specific (accounts, teams,
competitions, leaderboards) is deferred to later phases.

## Scope

**In scope:**
- Monorepo layout with `backend/` (Go) and `frontend/` (Next.js) side by side.
- Go backend scaffold: chi router, config loader, MongoDB connection helper,
  Clerk auth middleware (bare), `/health` handler, dependency init (`go.mod`).
- Next.js frontend scaffold: App Router + TypeScript + Tailwind, with
  `@clerk/nextjs`, `zustand`, `axios` installed and minimally wired.
- `.env` example files for both sides (no real credentials).

**Out of scope (later phases):**
- Real Clerk keys / MongoDB Atlas cluster / running end-to-end verification.
- Domain models (user, team, competition, leaderboard, puzzle, CSS submission).
- Git/GitHub setup (explicitly deferred by user).
- Any UI beyond a placeholder landing page.

## Tech Stack (locked)

| Layer     | Choice |
| --------- | ------ |
| Backend   | Go + `go-chi/chi/v5` |
| Frontend  | Next.js (App Router, TypeScript) |
| Styling   | Tailwind only (component library added later if needed) |
| State     | zustand |
| HTTP      | axios |
| Database  | MongoDB (official `mongo-driver`) — Atlas M0 later |
| Auth      | Clerk (`@clerk/nextjs` front, `clerk-sdk-go/v2` back) |

## Backend Layout — `backend/`

```
backend/
├── cmd/api/main.go              # entrypoint: load config → connect Mongo → chi router → listen :8082
├── internal/
│   ├── config/config.go         # read env: PORT, MONGO_URI, MONGO_DB, CLERK_SECRET_KEY, FRONTEND_ORIGIN
│   ├── db/mongo.go              # Connect() → *mongo.Database, with Ping
│   ├── middleware/auth.go       # bare Clerk JWT verify → userID into request context
│   ├── handlers/health.go      # GET /health → 200 (+ DB ping)
│   └── models/                 # empty placeholder for now
├── go.mod / go.sum
└── .env.example
```

- **Module path:** `github.com/ecsegames/backend` (placeholder, rename on GitHub setup).
- **Deps:** `go-chi/chi/v5`, `go-chi/cors`, `go.mongodb.org/mongo-driver`,
  `clerk/clerk-sdk-go/v2`, `joho/godotenv`.
- **Port:** `:8082`. CORS allows `FRONTEND_ORIGIN` (`http://localhost:3000`).

## Frontend Layout — `frontend/`

Scaffolded via `create-next-app` (TypeScript, App Router, Tailwind, `src/`, ESLint), then:

```
frontend/src/
├── app/layout.tsx              # wraps <ClerkProvider>
├── app/page.tsx                # landing placeholder
├── middleware.ts               # Clerk route middleware
├── lib/api.ts                  # axios instance (baseURL from env, attaches Clerk token)
└── store/                      # zustand placeholder store
```

- **Deps added on top of create-next-app:** `@clerk/nextjs`, `zustand`, `axios`.
- **Port:** `:3000`.

## Config Stubs (no live keys)

- `backend/.env.example`: `PORT`, `MONGO_URI`, `MONGO_DB`, `CLERK_SECRET_KEY`, `FRONTEND_ORIGIN`
- `frontend/.env.local.example`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`

## Definition of "minimal connection code"

Enough to prove wiring exists, nothing runs against live services:
Mongo `Connect()` helper, one Clerk auth middleware, one `/health` handler,
an axios instance, and Clerk provider + middleware on the frontend.

## Notes for Later Phases (not this task)

- Role model: Admin / Exec / Student — likely via Clerk `publicMetadata`.
- McGill email restriction (`@mcgill.ca`) via Clerk allowlist.
- Exec-created student accounts via Clerk Backend API.
- These are real auth-phase design tasks; the scaffold does not lock them in.
