import { clerkMiddleware } from "@clerk/nextjs/server";

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
