# Deployment / Dev-Gated Checklist

Everything in the project that is currently wired for **local development** and must
change before/for **production**. Work top to bottom when you deploy.

> Legend: 🔑 secret/key · 🌐 URL/origin · 🪝 webhook · 🗄️ database · 🛠️ dev-only tooling

---

## 1. 🪝 Clerk webhook (the "ngrok" item)

**Dev:** Clerk can't reach `localhost`, so we relay events through the Clerk CLI:

```bash
clerk webhooks listen --forward-to http://localhost:8082/webhooks/clerk
```

This prints a relay URL (`https://webhooks.clerk.com/in/c_.../`). You must add that URL
as a webhook endpoint in the **Clerk Dashboard → Webhooks** (subscribe to `user.created`),
then copy that endpoint's **signing secret** into `backend/.env` as
`CLERK_WEBHOOK_SIGNING_SECRET`. Events only flow while the CLI is running.

**Prod:** The backend has a real public URL, so no relay/tunnel is needed.
- Create a **permanent webhook endpoint** in the Clerk Dashboard pointing at
  `https://<your-backend-domain>/webhooks/clerk` (subscribe to `user.created`).
- Put **that endpoint's** signing secret into the production `CLERK_WEBHOOK_SIGNING_SECRET`
  env var (it is a *different* secret from the dev relay endpoint).
- Stop relying on `clerk webhooks listen` — that's dev-only.

## 2. 🔑 Clerk instance & keys

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

## 3. 🗄️ MongoDB Atlas

**Dev:** Atlas M0 free cluster; `MONGO_URI` lives in `backend/.env` (git-ignored).
Network Access likely set to `0.0.0.0/0` for convenience.

**Prod:**
- Put `MONGO_URI` (and `MONGO_DB`) into the backend host's env vars.
- **Tighten Network Access**: restrict to the backend host's egress IPs instead of
  `0.0.0.0/0` where the host supports it.
- Consider a separate database/cluster for prod vs. dev so test data stays out of prod.
- (Optional hardening) add a unique index on `users.clerkId` — the upsert already prevents
  duplicates logically, but the index enforces it at the DB level.
- (Optional hardening) same for a compound unique index on `scoreEntries (eventId, team)` —
  a team's points-per-event upsert relies on the same "logically enforced, not DB-enforced"
  pattern.

## 4. 🌐 URLs, ports & CORS

**Dev:** backend `http://localhost:8082`, frontend `http://localhost:3000`.

| Setting | File | Dev value | Prod change |
|---------|------|-----------|-------------|
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | `http://localhost:8082` | `https://<backend-domain>` |
| `FRONTEND_ORIGIN` (CORS allow-list) | `backend/.env` | `http://localhost:3000` | `https://<frontend-domain>` |
| `PORT` | `backend/.env` | `8082` | often set by the host (e.g. `$PORT`) |

The Go CORS config allows exactly `FRONTEND_ORIGIN`, so it must be the real frontend origin
in prod or browser calls will be blocked.

## 5. 🔑 Where secrets live

**Dev:** `backend/.env` and `frontend/.env.local` (both git-ignored).
**Prod:** set every secret in the hosting platform's env-var UI. Never commit real secrets.
The committed `*.example` files are the source of truth for *which* vars exist.

## 6. 🛠️ Dev-only tooling (do NOT run in prod)

| Tool | Dev use | Prod |
|------|---------|------|
| `air` | backend hot-reload (`backend/.air.toml`) | run the compiled binary: `go build -o api ./cmd/api && ./api` |
| `npm run dev` | Next.js dev server | `npm run build` + `npm start` (or deploy to Vercel) |
| `clerk webhooks listen` | relays Clerk events to localhost | not used — real endpoint instead (§1) |
| Graphify Claude hook (`.claude/settings.json`) | local AI context | irrelevant to the deployed app |

## 7. Hosting (still to decide)

Not yet chosen. Frontend → Vercel is the natural fit (zero-config Next.js). Backend (Go) →
a host that keeps an always-on process (Render / Railway / Fly). See the earlier discussion
in chat / `docs/superpowers/`. Once chosen, revisit whether a backend `Dockerfile` is needed.

---

## Quick pre-deploy checklist

- [ ] Clerk production instance created; all keys swapped to `pk_live_`/`sk_live_`
- [ ] Permanent Clerk webhook endpoint → `https://<backend>/webhooks/clerk`, `user.created` subscribed
- [ ] `CLERK_WEBHOOK_SIGNING_SECRET` (prod endpoint's) set on backend host
- [ ] `MONGO_URI` / `MONGO_DB` set on backend host; Atlas Network Access tightened
- [ ] `NEXT_PUBLIC_API_URL` → prod backend URL
- [ ] `FRONTEND_ORIGIN` → prod frontend URL
- [ ] All secrets in host env vars, none committed
- [ ] Backend deployed as compiled binary (not `air`); frontend built (not `npm run dev`)
