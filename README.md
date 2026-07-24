# ECSESS Games

The website that runs the **ECSESS Games** — a competition where students register with a
McGill email, join one of three program teams (Electrical, Computer, or Software), and earn
points in timed competitions, puzzles, and an in-house HTML/CSS challenge. Execs create
competitions and enter scores; leaderboards track standings.

This document assumes **no prior knowledge** of the tools involved. Every technology is
explained from scratch. If you've never touched Go, React, or a database before, start here
and read top to bottom.

---

## 1. The big picture

The project is split into two programs that run side by side and talk to each other over the
network:

```
                    ┌──────────────────────────────────────────────┐
   Your browser ──▶ │  FRONTEND (Next.js)   http://localhost:3000   │
                    │  The pages, buttons, and layouts you see.     │
                    └───────────────────┬──────────────────────────┘
                                        │  HTTP requests (via axios)
                                        ▼
                    ┌──────────────────────────────────────────────┐
                    │  BACKEND (Go + chi)   http://localhost:8082   │
                    │  The "brain": rules, scoring, who-can-do-what.│
                    └───────────┬───────────────────┬──────────────┘
                                │                   │
              reads/writes data │                   │ verifies logins
                                ▼                   ▼
                    ┌────────────────────┐  ┌────────────────────┐
                    │  DATABASE          │  │  AUTH (Clerk)      │
                    │  MongoDB (Atlas)   │  │  logins & accounts │
                    └────────────────────┘  └────────────────────┘
```

- **Frontend** = everything that runs *in the user's web browser*. It draws the screens and
  sends requests when the user clicks things. It cannot be trusted with secrets or rules,
  because anyone can open the browser's dev tools and tamper with it.
- **Backend** = a program running *on a server* (here, your laptop during development). It
  holds the real rules — who is allowed to award points, how scores are calculated — and is
  the only thing allowed to talk to the database. The frontend asks it questions; it answers.
- **Database** = where information is permanently stored (accounts, teams, scores). If the
  backend restarts, the data is still there.
- **Auth** = a separate service (Clerk) that handles the tricky, security-sensitive job of
  logging users in and proving who they are.

This two-part split (browser code vs. server code) is the single most important idea in the
project. Keep it in mind as you read the rest.

---

## 2. What is a "monorepo"?

A **repository** ("repo") is just a folder whose changes are tracked by version-control
software (Git). A **monorepo** ("mono" = one) means we keep *both* programs — the frontend
and the backend — inside a single repo instead of two separate ones. That's why this folder
contains a `frontend/` and a `backend/` next to each other. The benefit: one place to clone,
one shared history, and changes that touch both sides can be reviewed together.

---

## 3. The backend, explained

The backend is written in **Go** and lives in [`backend/`](backend/).

### Go (aka Golang)

**Go** is a programming language made by Google. You write human-readable `.go` files, then a
**compiler** turns them into a single fast machine-code program (a "binary") that runs
directly on the operating system — no interpreter needed at runtime. Go is popular for web
backends because it's fast, has excellent built-in support for handling many network requests
at once, and produces one self-contained executable that's easy to deploy.

Key vocabulary:
- **Package** — a folder of related Go files that work as a unit. The first line of every Go
  file (`package config`, `package db`, …) declares which package it belongs to.
- **Module** — the whole project as Go sees it, named in `go.mod`. Ours is
  `github.com/ecsegames/backend`. That name is how packages inside the project import each
  other (e.g. `import "github.com/ecsegames/backend/internal/config"`).
- **`go.mod` / `go.sum`** — the dependency manifest. `go.mod` lists which external libraries
  (and versions) we use; `go.sum` records cryptographic checksums so nobody can swap in a
  tampered version. These are the Go equivalent of `package.json` / `package-lock.json`.

### chi — the "router"

When a request arrives (say, `GET /health`), something has to decide *which piece of code
should handle it*. That job is called **routing**, and **chi** (`go-chi/chi`) is the small
library we use for it. You tell chi "when a GET request comes in for `/health`, run this
function," and it wires that up. chi is deliberately minimal — it's built on top of Go's
standard library rather than replacing it — which keeps the code easy to understand.

chi also gives us **middleware**: functions that run *before* your handler, wrapping every
request. We use middleware for logging (print every request), recovery (if code crashes,
return a clean error instead of killing the server), CORS (see below), and authentication.

### CORS (`go-chi/cors`)

**CORS** (Cross-Origin Resource Sharing) is a browser security rule. By default, a web page
served from `localhost:3000` is *not allowed* to call an API on a different origin like
`localhost:8082` — the browser blocks it to protect users. To permit our own frontend to talk
to our own backend, the backend must send back headers that say "requests from
`http://localhost:3000` are welcome." The `go-chi/cors` middleware adds those headers. Without
it, the frontend's requests would silently fail in the browser.

### MongoDB & the Mongo driver

**MongoDB** is the **database** — the program that stores our data permanently on disk. Unlike
traditional "SQL" databases that store data in rigid tables of rows and columns, MongoDB is a
**document database**: it stores flexible, JSON-like objects called *documents*, grouped into
*collections*. For example, one student might be a document like
`{ name: "Ada", team: "Software", points: 42 }`. This flexibility suits a project whose data
shapes are still evolving.

- **MongoDB Atlas** is MongoDB's *managed cloud* version — you don't install or run the
  database yourself; you rent a copy that lives on their servers and connect to it over the
  internet using a **connection string** (a URL that includes your username, password, and
  cluster address). We target Atlas's free "M0" tier.
- The **Mongo driver** (`go.mongodb.org/mongo-driver`) is the Go library that lets our Go code
  actually *talk* to MongoDB — open a connection, run queries, read and write documents.

During local development you don't need a database at all: if no connection string is
configured, the backend just logs "starting without database" and runs anyway.

### Clerk (backend side)

See §5 for the full explanation of Clerk. On the backend, `clerk-sdk-go/v2` is the Go library
that lets our server **verify** that a request genuinely comes from a logged-in user. When the
frontend makes a request, it attaches a signed token; our auth middleware uses Clerk's library
to check that token is real and figure out which user it belongs to.

### godotenv & environment variables

Programs need configuration that differs between machines and must stay secret — database
passwords, API keys, port numbers. The standard practice is to keep these in the program's
**environment variables** rather than hard-coding them into the source (which would leak them
to anyone who reads the code). For convenience during development, we store them in a file
named `.env`, and the **godotenv** library loads that file into environment variables when the
program starts. Crucially, `.env` is **never committed to Git** (it's git-ignored), so secrets
stay on your machine. A safe, secret-free template called `.env.example` *is* committed so you
know which variables to fill in.

### air — automatic reloading (a dev convenience)

Normally, every time you change a `.go` file you'd have to stop the server and restart it to
see the change. **air** watches your files and does that automatically: on save, it rebuilds
and restarts the backend for you. It's purely a development tool — not part of the shipped
program. Its behavior is configured in `backend/.air.toml`.

---

## 4. The frontend, explained

The frontend lives in [`frontend/`](frontend/) and runs in the web browser.

### Node.js & npm

**Node.js** is a program that runs JavaScript *outside* the browser — on your computer's
command line. We need it because all the frontend tooling (the build system, the dev server)
is itself written in JavaScript and runs on Node. **npm** ("Node Package Manager") comes with
Node; it downloads the frontend's library dependencies (into a `node_modules/` folder) and
runs project scripts like `npm run dev`. The exact dependency versions are pinned in
`package-lock.json`.

### React

**React** is a JavaScript library for building user interfaces out of reusable pieces called
**components**. A component is a function that returns a description of some UI (a button, a
form, a whole page). React efficiently keeps the actual browser screen in sync with your
components as data changes, so you describe *what* the UI should look like and React handles
*updating* it. Files ending in `.tsx` are React components.

### Next.js

**Next.js** is a **framework** built on top of React — meaning it's a bigger, opinionated
toolkit that adds the pieces a real website needs beyond raw React: a routing system (which
URL shows which page), a development server, a production build system, and ways to run some
code on the server for speed and SEO. It's the backbone of the frontend.

> ⚠️ **Important version note:** we're on **Next.js 16**, which is very new and has some
> breaking changes from older versions you might find in tutorials. Most notably, the special
> file that runs code on every request — historically called `middleware.ts` — was **renamed
> to `proxy.ts`** in Next 16 (same behavior, new name). If a guide online mentions
> `middleware.ts`, that's our `proxy.ts`.

In Next's "App Router," the folder `src/app/` maps to your site's URLs: `src/app/page.tsx` is
the home page (`/`), and a `src/app/leaderboard/page.tsx` would become the `/leaderboard`
page. `src/app/layout.tsx` is the shared shell wrapped around every page.

### TypeScript

**TypeScript** is JavaScript with **types** added. In plain JavaScript, a variable can
silently hold anything, and typos or wrong-shaped data only blow up when the code runs.
TypeScript lets you *declare* the shape of your data ("this is a number," "this object has a
`name` string and a `points` number"), and a checker catches mismatches *before* you run the
code — right in your editor. It compiles down to ordinary JavaScript. Files end in `.ts`
(logic) or `.tsx` (React components). Configuration lives in `tsconfig.json`.

### Tailwind CSS

**CSS** is the language that styles web pages (colors, spacing, fonts, layout). **Tailwind**
is a CSS toolkit that gives you thousands of tiny, single-purpose classes you apply directly
in your markup — e.g. `class="flex items-center gap-4 text-xl font-bold"` means "lay out
horizontally, center vertically, add a gap, large bold text." Instead of writing separate
stylesheets, you compose styles inline from these building blocks, which keeps styling close
to the component it affects.

> **Version note:** we use **Tailwind v4**, which is configured *in CSS* rather than through a
> JavaScript config file. That's why there's no `tailwind.config.js` — the setup lives at the
> top of `src/app/globals.css` (the line `@import "tailwindcss";`) and in
> `postcss.config.mjs`.

### Zustand — state management

As an app grows, different components need to share the same information — e.g. "who is the
logged-in user" or "which team did they pick." Passing that data manually through every
component gets painful. **Zustand** is a tiny **state-management** library: it creates a
central "store" (a shared bucket of data) that any component can read from or update, and
components automatically re-render when the data they use changes. Right now we have a single
placeholder store in `src/store/`; real stores (auth, team, competitions) come later.

### axios — talking to the backend

**axios** is a library for making **HTTP requests** — the mechanism a web page uses to ask a
server for data or send it. When the frontend needs to load a leaderboard or submit a score,
it uses axios to call the Go backend's API. We keep a single pre-configured axios instance in
`src/lib/api.ts` so every request automatically points at the right backend URL.

---

## 5. Authentication with Clerk

**Authentication** ("auth") means proving *who a user is* (logging in), and **authorization**
means deciding *what they're allowed to do* (a Student can't award points; an Exec can).
Getting login security right is hard and dangerous to do yourself, so we use **Clerk**, a
managed service that handles it for us.

How it fits together:
- The **frontend** uses Clerk's `@clerk/nextjs` library to show sign-in/sign-up screens and
  keep track of the logged-in session in the browser. `ClerkProvider` (in `layout.tsx`) makes
  the login state available to every page, and `src/proxy.ts` protects routes.
- When the frontend calls the backend, it attaches a Clerk-issued **token** (a tamper-proof
  digital ID card).
- The **backend** uses Clerk's `clerk-sdk-go` library to *verify* that token and learn which
  user made the request — without ever handling raw passwords itself.

Clerk needs two keys to work, which you get from the Clerk dashboard: a **publishable key**
(safe to expose in the browser, starts with `pk_`) and a **secret key** (backend only, must
stay private, starts with `sk_`). During development the app boots with harmless dummy keys;
real login only works once you plug in real keys.

---

## 6. File structure

### Backend — `backend/`

```
backend/
├── cmd/
│   └── api/
│       └── main.go          ← THE ENTRY POINT. Running the backend runs this file.
│                              It loads config, connects to Mongo (if configured),
│                              sets up the chi router + middleware, and starts
│                              listening on port 8082.
├── internal/                ← Private packages. "internal" is a Go convention meaning
│   │                          "only importable by this module" — our own code.
│   ├── config/
│   │   └── config.go        ← Reads settings from environment variables (port, Mongo
│   │                          URI, Clerk key, allowed frontend origin) into one struct.
│   ├── db/
│   │   └── mongo.go         ← Opens and verifies the MongoDB connection. One function,
│   │                          Connect(), returns a database handle or an error.
│   ├── middleware/
│   │   └── auth.go          ← The Clerk auth middleware. Checks the token on incoming
│   │                          requests and attaches the user's ID, or rejects with 401.
│   ├── handlers/
│   │   └── health.go        ← Request handlers (the code that answers a route). Right
│   │                          now just /health, which returns {"status":"ok"} — a
│   │                          simple "is the server alive?" check.
│   └── models/
│       └── .gitkeep         ← Empty placeholder folder. Will hold data shapes (User,
│                              Team, Competition, …) once we build features. (.gitkeep
│                              exists only so Git tracks the otherwise-empty folder.)
├── .air.toml                ← Config for the "air" auto-reload dev tool.
├── .env                     ← YOUR local secrets/config (git-ignored, never committed).
├── .env.example             ← Committed, secret-free template showing which vars to set.
├── go.mod                   ← Module name + list of dependencies and their versions.
└── go.sum                   ← Security checksums for those dependencies.
```

The layout follows a common Go convention: `cmd/` holds entry points (programs you can run),
and `internal/` holds the private packages those programs are built from. The chain of
dependencies flows `main.go → config → db / middleware / handlers`.

### Frontend — `frontend/`

```
frontend/
├── src/
│   ├── app/                 ← Next.js App Router. Folder structure here = your site's URLs.
│   │   ├── layout.tsx       ← The shared shell wrapped around every page. Hosts
│   │   │                      <ClerkProvider> so login state is available everywhere.
│   │   ├── page.tsx         ← The home page ("/"). Currently a placeholder landing.
│   │   ├── globals.css      ← Global styles + the Tailwind v4 import.
│   │   └── favicon.ico      ← The little icon shown in the browser tab.
│   ├── lib/
│   │   └── api.ts           ← The pre-configured axios instance for calling the backend.
│   ├── store/
│   │   └── useAppStore.ts   ← A placeholder Zustand store (shared frontend state).
│   └── proxy.ts             ← Clerk route protection (Next 16's renamed "middleware").
│                              Runs on requests before pages render.
├── public/                  ← Static files served as-is (images, SVGs).
├── .env.local               ← YOUR local frontend secrets/config (git-ignored).
├── .env.local.example       ← Committed, secret-free template.
├── package.json             ← Project metadata, dependency list, and scripts (dev/build).
├── package-lock.json        ← Exact pinned versions of every installed dependency.
├── tsconfig.json            ← TypeScript configuration.
├── next.config.ts           ← Next.js configuration.
├── postcss.config.mjs       ← Wires up Tailwind's CSS processing.
├── eslint.config.mjs        ← ESLint config (a tool that flags likely mistakes/bad style).
└── node_modules/            ← Downloaded dependencies (git-ignored; recreated by npm install).
```

### Repo root

```
ecsegames/
├── backend/                 ← the Go backend (above)
├── frontend/                ← the Next.js frontend (above)
├── docs/superpowers/        ← design specs and the implementation plan for this project
├── .gitignore               ← lists files Git should never track (secrets, build output)
└── README.md                ← this file
```

---

## 7. Getting set up

You need three things installed on your machine:

| Tool        | What for                          | Check it's installed | If missing (macOS)          |
| ----------- | --------------------------------- | -------------------- | --------------------------- |
| **Go**      | building/running the backend      | `go version`         | `brew install go`           |
| **Node.js** | building/running the frontend     | `node --version`     | `brew install node`         |
| **air**     | backend auto-reload (optional)    | `air -v`             | `go install github.com/air-verse/air@latest` |

> After installing `air`, the command lives in `~/go/bin`. Make sure that folder is on your
> PATH (this project added `export PATH="$HOME/go/bin:$PATH"` to `~/.zshrc`). Open a new
> terminal, or run `source ~/.zshrc`, for the `air` command to be found.

### First-time configuration

```bash
# Backend: create your local config from the template
cd backend
cp .env.example .env
# (Leave MONGO_URI and the Clerk key blank for now — the app runs fine without them.)

# Frontend: create your local config from the template
cd ../frontend
cp .env.local.example .env.local
npm install                 # download frontend dependencies (one time)
```

---

## 8. Running it for development

Open **two terminals** — one per server.

**Terminal 1 — backend** (with auto-reload):
```bash
cd backend
air                         # rebuilds & restarts automatically when you edit .go files
```
Serves the API at **http://localhost:8082**. (No `air`? Plain `go run ./cmd/api` also works,
but you'll restart it manually after changes.)

**Terminal 2 — frontend:**
```bash
cd frontend
npm run dev                 # Next.js dev server with live reload
```
Serves the site at **http://localhost:3000**.

**Quick health check** that the backend is alive:
```bash
curl localhost:8082/health   # → {"status":"ok"}
```

> **Troubleshooting — "address already in use" on :8082:** `air` runs the backend as a child
> process; if it ever exits uncleanly, a stray backend can keep holding the port. Clear it
> with `pkill -f 'tmp/api'` and start `air` again.

---

## 9. Environment variables reference

These come from the `.env.example` / `.env.local.example` templates. Fill them in when you're
ready to connect real services; leave them blank/dummy for basic local development.

**Backend (`backend/.env`):**

| Variable            | Meaning                                                          |
| ------------------- | --------------------------------------------------------------- |
| `PORT`              | Port the backend listens on (default `8082`).                   |
| `MONGO_URI`         | MongoDB Atlas connection string. Blank = run without a database.|
| `MONGO_DB`          | Which database name to use (default `ecsegames`).               |
| `CLERK_SECRET_KEY`  | Clerk secret key (`sk_...`) — backend token verification.       |
| `FRONTEND_ORIGIN`   | The frontend's URL, for CORS (default `http://localhost:3000`). |

**Frontend (`frontend/.env.local`):**

| Variable                             | Meaning                                              |
| ------------------------------------ | ---------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`                | Backend base URL the frontend calls (`http://localhost:8082`). |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`  | Clerk publishable key (`pk_...`) — safe for the browser. |
| `CLERK_SECRET_KEY`                   | Clerk secret key — used by Clerk's server-side helpers. |

> Variables prefixed `NEXT_PUBLIC_` are the only ones Next.js exposes to browser code —
> everything else stays server-side. Never put a real secret behind a `NEXT_PUBLIC_` name.

---

## 10. Technology summary

| Layer      | Technology                        | One-line role                                  |
| ---------- | --------------------------------- | ---------------------------------------------- |
| Frontend   | Next.js 16 (on React 19)          | The website framework — pages and UI.          |
| Frontend   | TypeScript                        | JavaScript with type-checking.                 |
| Frontend   | Tailwind CSS v4                   | Utility-class styling.                         |
| Frontend   | Zustand                           | Shared frontend state.                         |
| Frontend   | axios                             | Calls the backend API.                         |
| Backend    | Go                                | The server language.                           |
| Backend    | chi                               | HTTP routing + middleware.                      |
| Backend    | MongoDB (Atlas) + Mongo driver    | Data storage.                                  |
| Auth       | Clerk (`@clerk/nextjs` + `clerk-sdk-go`) | Logins, accounts, and roles.            |
| Dev tool   | air                               | Backend auto-reload.                           |

---

## 11. Status

This is the **foundation scaffold only** — the plumbing is wired up and everything builds and
runs, but there is no game logic yet (no real accounts, teams, competitions, or leaderboards).
The design specs and the step-by-step build plan live in
[`docs/superpowers/`](docs/superpowers/).
