import type { Metadata } from "next";
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
        {/* Sign-out goes straight to the public sign-in page, not the
            protected home route (which would stall on the auth gate). */}
        <ClerkProvider afterSignOutUrl="/sign-in">{children}</ClerkProvider>
      </body>
    </html>
  );
}
