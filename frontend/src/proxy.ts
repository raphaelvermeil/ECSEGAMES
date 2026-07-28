import { clerkMiddleware } from "@clerk/nextjs/server";

// Auth is enforced per-resource via `await auth.protect()` in each page/layout,
// with the @clerk/eslint-plugin rule guaranteeing every route is covered.
// Middleware stays minimal — Clerk deprecated middleware-based route protection.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Run on everything except Next internals and static assets
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|gif|png|svg|ico|webp)).*)",
    "/(api|trpc)(.*)",
    // Clerk's handshake/auth proxy path
    "/__clerk/:path*",
  ],
};
