# Deployment / Dev-Gated Checklist

Everything in the project that is currently wired for **local development** and must
change before/for **production**. Work top to bottom when you deploy.

> Legend: 🔑 secret/key · 🌐 URL/origin · 🗄️ database · 🛠️ dev-only tooling

> **No Clerk webhook is needed.** Users are created in MongoDB lazily on their first
> authenticated request to `/api/me`, keyed on the Clerk ID from the verified session
> token. Dev and prod behave identically, with no relay, tunnel, or signing secret.

---

## 1. 🔑 Clerk instance & keys

**Dev:** Using Clerk's **development instance** with test keys.
- `frontend/.env.local`: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...`, `CLERK_SECRET_KEY=sk_test_...`
- `backend/.env`: `CLERK_SECRET_KEY=sk_test_...`
- `frontend/.env.local` currently holds a **dummy** publishable key just so `next build`
  passes locally — real auth needs your real dev key.

**Prod:** Create/deploy a Clerk **production instance** (`clerk doctor` currently reports
"production not configured").
- Swap all keys to production: `pk_live_...` / `sk_live_...`.
- Set them in the hosting platform's env vars (frontend host + backend host), **not** in
  committed files.

## 2. 🗄️ MongoDB Atlas

**Dev:** Atlas M0 free cluster; `MONGO_URI` lives in `backend/.env` (git-ignored).
Network Access likely set to `0.0.0.0/0` for convenience.

**Prod:**
- Put `MONGO_URI` (and `MONGO_DB`) into the backend host's env vars.
- **Tighten Network Access**: restrict to the backend host's egress IPs instead of
  `0.0.0.0/0` where the host supports it.
- Consider a separate database/cluster for prod vs. dev so test data stays out of prod.
- (Optional hardening) add a unique index on `users.clerkId` — the upsert already prevents
  duplicates logically, but the index enforces it at the DB level.

## 3. 🌐 URLs, ports & CORS

**Dev:** backend `http://localhost:8082`, frontend `http://localhost:3000`.

| Setting | File | Dev value | Prod change |
|---------|------|-----------|-------------|
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | `http://localhost:8082` | `https://<backend-domain>` |
| `FRONTEND_ORIGIN` (CORS allow-list) | `backend/.env` | `http://localhost:3000` | `https://<frontend-domain>` |
| `PORT` | `backend/.env` | `8082` | often set by the host (e.g. `$PORT`) |

The Go CORS config allows exactly `FRONTEND_ORIGIN`, so it must be the real frontend origin
in prod or browser calls will be blocked.

## 4. 🔑 Where secrets live

**Dev:** `backend/.env` and `frontend/.env.local` (both git-ignored).
**Prod:** set every secret in the hosting platform's env-var UI. Never commit real secrets.
The committed `*.example` files are the source of truth for *which* vars exist.

## 5. 🛠️ Dev-only tooling (do NOT run in prod)

| Tool | Dev use | Prod |
|------|---------|------|
| `air` | backend hot-reload (`backend/.air.toml`) | run the compiled binary: `go build -o api ./cmd/api && ./api` |
| `npm run dev` | Next.js dev server | `npm run build` + `npm start` (or deploy to Vercel) |
| Graphify Claude hook (`.claude/settings.json`) | local AI context | irrelevant to the deployed app |

## 6. Hosting (still to decide)

Not yet chosen. Frontend → Vercel is the natural fit (zero-config Next.js). Backend (Go) →
a host that keeps an always-on process (Render / Railway / Fly). See the earlier discussion
in chat / `docs/superpowers/`. Once chosen, revisit whether a backend `Dockerfile` is needed.

---

## Quick pre-deploy checklist

- [ ] Clerk production instance created; all keys swapped to `pk_live_`/`sk_live_`
- [ ] `MONGO_URI` / `MONGO_DB` set on backend host; Atlas Network Access tightened
- [ ] `NEXT_PUBLIC_API_URL` → prod backend URL
- [ ] `FRONTEND_ORIGIN` → prod frontend URL
- [ ] All secrets in host env vars, none committed
- [ ] Backend deployed as compiled binary (not `air`); frontend built (not `npm run dev`)
