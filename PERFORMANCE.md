# Navigation performance — known issues

Written up after investigating why switching navbar tabs feels laggy on a laptop
(Ryzen 7 4800H, 16 GB) but not on a desktop. A record of the findings and the intended fix
for each, ordered by expected impact.

**Status: items 3, 4, 5 and 7 are fixed** (client router cache via `experimental.staleTimes`,
a shared `(app)/loading.tsx`, `prefetch` on the nav links, `Promise.all` in
`schedule/page.tsx`, and the meet-the-team work under item 7). Items 1, 2 and 6 still
stand. See the "Correction" note under item 4 — its original diagnosis was wrong.
Items 8 and 9 were found in a second pass (September 2026) and are fixed.

The short version: the hardware gap explains why one machine feels worse than the other,
but the latency itself is structural. Every tab switch is a blocking server round-trip to
a cloud database with no loading UI, so there is a few hundred milliseconds of dead time
on every click that the app gives the user no feedback about. A faster CPU hides it; a
slower one exposes it.

---

## 1. Laptop is on the "Power saver" power plan

`powercfg /getactivescheme` returns Power saver, and `Win32_Battery` reports AC power —
so the machine is plugged in but still clock-capped well below its 4.2 GHz boost. Next.js
dev compilation and React hydration are both single-thread bound, so this hits exactly the
work that makes tab switches slow.

**Fix:** switch to Balanced or High performance. Costs nothing, and it should be
re-measured before any code changes so the code fixes can be judged on their own.

---

## 2. No production build has ever been made

`.next/` exists but contains no `BUILD_ID`, and `frontend/package.json` only ever runs
`next dev`:

```5:8:frontend/package.json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
```

In dev mode Next compiles each route on first visit, so the first click on Schedule or
Meet-the-team pays a full compile. That is the single most CPU-hungry thing the app does,
and it is precisely what a capped clock punishes.

**Fix:** run `npm run build && npm start` when judging real-world navigation speed. Dev
timings are not representative.

---

## 3. Prefetching is silently a no-op — no `loading.tsx` anywhere

This is the core architectural issue. From the Next 16 docs bundled in
`frontend/node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`:

> **Static Route**: the full route is prefetched.
> **Dynamic Route**: prefetching is skipped, or the route is partially prefetched if
> `loading.tsx` is present.

Every route here is dynamic — each one calls `auth.protect()` (reads cookies/headers) and
the shared layout does a `cache: "no-store"` fetch. And there is no `loading.tsx`,
`template.tsx`, or `<Suspense>` boundary anywhere under `frontend/src/app` (searched, zero
files).

The consequence: the navbar's `<Link>` components prefetch nothing, and on click the
browser stays on the old page with no visual change at all until the server finishes. The
docs name this symptom directly — "This can give the users the impression that the app is
not responding."

Confirmed empirically once a production build existed: `.next/prerender-manifest.json`
lists only `_global-error`, `_not-found` and `favicon.ico`. Not one `(app)` route is
prerendered. Even `/events` and `/sponsors` — static "Coming soon" pages with no data —
paid a full RSC round-trip per click, which is why every tab felt equally slow.

**Fixed.** Three changes together:
- `frontend/src/app/(app)/loading.tsx` — one shared skeleton for the group. Enables
  partial prefetching and commits navigation immediately.
- `experimental.staleTimes: { dynamic: 300, static: 300 }` in `next.config.ts` — a
  5-minute client router cache, so returning to a tab costs nothing. Both values are
  needed: adding `loading.tsx` moves default-prefetched routes from the `static` bucket
  into `dynamic`, which defaults to 0 (uncached).
- `prefetch` on the `NAV_LINKS` links in `Navbar.tsx` and `MobileNavMenu.tsx` — a full
  prefetch of the dynamic route rather than a partial one.

Known limit of the cache: an event edited by one person can take up to 5 minutes to reach
someone who already has the schedule cached. Saving from the schedule itself calls
`router.refresh()`, which clears that route's cache immediately, so the editor always sees
their own change.

---

## 4. The app shell refetches the user from a cloud DB on every navigation

```20:23:frontend/src/app/(app)/layout.tsx
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
```

`MONGO_URI` is a MongoDB Atlas connection string, so this is a real round-trip to the
cloud rather than a local lookup. Backend logs measured `/api/me` at **94 ms to 604 ms**
per hit.

**Correction — the claim below was wrong.** This originally said the call "runs on every
route change within `(app)`". It does not. Partial rendering excludes layouts from soft
navigation, so this fires on hard load and `router.refresh()` only, never on a tab click.
From `staleTimes.md` in the bundled Next 16 docs:

> This doesn't affect partial rendering, **meaning shared layouts won't automatically be
> refetched on every navigation, only the page segment that changes.**

The real per-tab-switch cost was in the *pages*, not the layout — see item 5.

**Fixed** as part of item 5 for `/schedule`. The layout's own call is a hard-load cost and
was left alone.

---

## 5. Schedule makes three sequential round-trips before rendering

The layout fetches `/api/me`, then the page fetches events *and* `/api/me` a second time:

```5:16:frontend/src/app/(app)/schedule/page.tsx
export default async function SchedulePage() {
  await auth.protect();
  const events = await listEvents();

  const { getToken } = await auth();
  const token = await getToken();
  const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const role = meRes.ok ? (await meRes.json()).role : null;
```

Measured in the logs: `/api/events` at 105–385 ms on top of two `/api/me` calls. All
sequential, all before first paint.

**Fixed** — the two calls now run in a `Promise.all`, saving the shorter of the two
(roughly 100–400 ms) on every cold schedule render.

Passing `role` down from the layout was considered and rejected: the layout doesn't
re-render on soft navigation (see item 4), so a layout-provided `role` would freeze at the
last hard load, and threading it through would need a client Context provider for one
boolean.

---

## 6. `auth.protect()` runs twice on every page

Once in `(app)/layout.tsx:15`, then again at the top of all seven pages:
`page.tsx:5`, `schedule/page.tsx:6`, `cs-comp/page.tsx:5`, `sponsors/page.tsx:5`,
`leaderboard/page.tsx:7`, `meet-the-team/page.tsx:6`, `events/page.tsx:4`.

**Won't fix — this was a bad idea and the page-level calls must stay.** Three reasons:

1. **The layout does not gate the pages.** Per the bundled Next 16 `authentication.md`:
   *"A layout also does not control whether the rest of the route renders. Route segments
   and parallel route slots are rendered by the router, so a layout that hides or swaps
   them does not stop them from running or from appearing in the RSC Payload."* Combined
   with item 4 — layouts don't re-render on navigation — the page-level `auth.protect()`
   is the app's **only** per-navigation auth check. The client cache added in item 3 makes
   the layout gate run *less* often, not more.
2. **ESLint already forbids it.** `frontend/eslint.config.mjs` enforces
   `@clerk/next/require-auth-protection` with `protected: ["**"]`. Removing any of them
   fails `npm run lint`.
3. **It would save nothing.** `auth.protect()` reads request headers with no network call.
   Its only cost is forcing dynamic rendering — which the layout already does for the
   whole group regardless, so the pages can't be made static either way.

---

## 7. Meet-the-team is a heavy client component

`frontend/src/app/(app)/meet-the-team/_components/CampScene.tsx` is ~1,609 lines with 62
decorative elements, 14 avatar images, and infinite CSS animations (`ecBob` per avatar,
`ecSun`). The mobile variant runs a continuous `requestAnimationFrame` loop. Hydrating all
of this is pure CPU work, so it scales directly with clock speed — which is why the gap
between the two machines is most obvious on this tab.

Oversized source images, all rendered at 66×66:

| File | Size |
|---|---|
| `public/coords/amir-saadati.png` | 792 KB |
| `public/coords/arold-bonkoungou.png` | 409 KB |
| `public/logo.png` | 209 KB |
| `public/coords/raphael-vermeil.jpg` | 153 KB |

**Fixed.** Three changes:
- Every photo is now a pre-sized 272×272 WebP in `public/coords/` (2.3 MB → 140 KB for
  the set) and both the scene avatar and the profile modal render the *same file* with
  `unoptimized`, so tapping a head is a browser-cache hit rather than a request for a
  freshly resized `/_next/image` variant — which was the visible delay on tap. The scene
  loads them eagerly so photos panned out of view on a phone are ready too.
- `CampScene` is wrapped in `React.memo`. The mobile pan loop was updating state ~22
  times a second for the slider thumb, and every update re-rendered the whole 1,600-line
  scene, so a tap had to wait behind whichever render was in flight.
- The mobile sun is positioned through `--sun-left`/`--sun-top` CSS variables written
  from the frame loop instead of React state, so it moves every frame without a render.

The scene still hydrates as a client component; that cost is a one-time ~50 ms and was
left alone.

---

## 8. The backend fetched Clerk's signing keys on every authenticated request

`RequireAuth` called `jwt.Verify` with no `JWK`, and the Clerk Go SDK then fetches the
whole JSON Web Key Set from Clerk's API before it can check the signature. So every
`/api/me`, every scores/history call, and every CS comp poll (the clock polls every 5 s)
paid a Clerk round trip on top of the Mongo one — the "94 ms to 604 ms" measured for
`/api/me` under item 4 was mostly this.

**Fixed:** `internal/middleware/auth.go` caches keys by key ID and only fetches on a miss,
so a rotated key still resolves and a steady-state request never leaves the process
before hitting Mongo.

---

## 9. The event sheet blurred the whole page behind it on phones

`EventDetailModal` had an unconditional `backdrop-blur-[4px]` on its full-screen
backdrop. A backdrop filter is re-composited every frame, and the sheet animates up over
220 ms, so on a phone the open animation was doing a full-screen blur per frame — that
was the "clicking an event takes a moment" feel. **Fixed** by making it `lg:` only, the
same rule `EventFormModal` already used.

---

## Ruled out

Worth recording so these don't get re-investigated:

- **The navbar itself is fine.** `Navbar.tsx` and `MobileNavMenu.tsx` use `next/link` with
  default prefetch; no `router.push`, no raw `<a>`, no `prefetch={false}` anywhere.
- **No heavy dependencies.** `frontend/package.json` has only `@clerk/nextjs`, `axios`,
  `next`, `react`, `react-dom`. No framer-motion, three.js, or chart libraries — the
  leaderboard chart is hand-rolled SVG.
- **No route transition animations.** Nav links only have `transition-colors`.
- **`backdrop-blur` is not on the navigation path** — only on schedule modals.
- **No videos** in `public/`.
