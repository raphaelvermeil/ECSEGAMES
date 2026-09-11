import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // next dev blocks /_next assets from any host that isn't localhost.
  // Phones on the same Wi-Fi hit http://192.168.x.x:3000, so Clerk's
  // client bundle 403s and the sign-in card never mounts. Dev-only.
  allowedDevOrigins: ["192.168.*.*"],

  experimental: {
    // Client-side router cache. Every route under (app) is dynamic — the
    // shared layout reads request headers (auth) on all of them — so
    // without this the default `dynamic: 0` means "not cached" and going
    // back to a tab you already opened refetches the whole route.
    //
    // Both values are set on purpose. Which one applies depends on how
    // much of the route was prefetched: `static` covers a full prefetch
    // (what prefetch={true} on the nav links gives us), `dynamic` covers a
    // partial one — and adding (app)/loading.tsx moves default-prefetched
    // routes into the `dynamic` bucket. Setting only `static` would leave
    // those uncached and silently undo half of this.
    //
    // 300s is a deliberate staleness budget: an event edited by an exec
    // can take up to five minutes to reach someone who already has the
    // schedule cached. Saving from the schedule itself calls
    // router.refresh(), which drops that route's cache immediately, so
    // the editor always sees their own change right away.
    staleTimes: { dynamic: 300, static: 300 },
  },
};

export default nextConfig;
