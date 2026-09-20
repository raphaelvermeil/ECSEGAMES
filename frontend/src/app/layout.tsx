import type { Metadata, Viewport } from "next";
import { Saira, Pixelify_Sans, IBM_Plex_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

// ECSESS uses Saira for everything; default weight 500.
const saira = Saira({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-saira",
});

// Retro display/mono pair for the Schedule tab's CRT-arcade look.
const pixelifySans = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pixelify",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "ECSE Games",
  description: "ECSE Games competition platform",
};

// viewportFit: "cover" is what lets the layout reach into an iPhone's safe
// areas — the notch/Dynamic Island strip at the top and the home-indicator
// strip at the bottom. Two things follow from it:
//
//  1. The dark chrome now runs edge to edge, so the status bar sits on the
//     app's own header instead of on a letterbox band in a slightly
//     different shade of black.
//  2. env(safe-area-inset-*) starts reporting real numbers. Until this
//     existed every one of those returned 0, which is why the schedule's
//     floating Add button had inset-aware positioning that never did
//     anything.
//
// Because the content can now sit under the hardware, anything pinned to a
// screen edge has to pad itself back out — see --app-safe-top/-bottom in
// globals.css and the sticky headers that consume them.
//
// themeColor matches --color-sched-chrome so the browser tints its own
// surrounding UI to match the header rather than guessing from the page.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1a1c1a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Browser extensions inject attributes onto <html> before React hydrates,
    // which React reports as a hydration mismatch. Suppression is one level
    // deep, so this only covers <html>'s own attributes.
    <html
      lang="en"
      className={`${saira.variable} ${pixelifySans.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* Sign-out lands on the home page. It used to go to /sign-in
            because every route was gated and home would have bounced them
            straight back; now that the app is readable signed out, dumping
            someone on a login form after they deliberately logged out is
            just rude.

            Sign-up always continues to team selection: a new account has
            no team yet, and nothing else in the app sends you there
            unless you open the CS comp. "Force" rather than "fallback" so
            it wins even when sign-up was reached with a redirect_url. */}
        <ClerkProvider
          afterSignOutUrl="/"
          signUpForceRedirectUrl="/select-team"
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
