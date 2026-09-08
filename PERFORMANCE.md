# Navigation performance — known issues

Written up after investigating why switching navbar tabs feels laggy on a laptop
(Ryzen 7 4800H, 16 GB) but not on a desktop. Nothing here has been fixed yet — this is a
record of the findings and the intended fix for each, ordered by expected impact.

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

**Fix:** add `loading.tsx` skeletons to the `(app)` routes. That enables partial
prefetching, makes the navigation commit immediately, and gives the user feedback while
the server works.

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
per hit. It runs on every route change within `(app)`, with caching explicitly off.

**Fix:** cache this. The user's team/name/major changes rarely; refetching it on every
click is the single largest recurring cost.

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

**Fix:** the page only needs `role`, which the layout already fetched — pass it down or
share one cached call. `listEvents()` could also run in parallel rather than after.

---

## 6. `auth.protect()` runs twice on every page

Once in `(app)/layout.tsx:15`, then again at the top of all seven pages:
`page.tsx:5`, `schedule/page.tsx:6`, `cs-comp/page.tsx:5`, `sponsors/page.tsx:5`,
`leaderboard/page.tsx:7`, `meet-the-team/page.tsx:6`, `events/page.tsx:4`.

The layout already gates the whole group, so the page-level calls are redundant.

**Fix:** drop the duplicates from the pages, keep the one in the layout. Smaller win than
the above, but free.

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

**Fix:** downscale/recompress the oversized images, and look at whether the decorative
scene needs to hydrate as a client component at all.

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
