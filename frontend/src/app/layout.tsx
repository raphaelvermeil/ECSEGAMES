import type { Metadata } from "next";
import { Saira } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

// ECSESS uses Saira for everything; default weight 500.
const saira = Saira({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-saira",
});

export const metadata: Metadata = {
  title: "ECSESS Games",
  description: "ECSESS Games competition platform",
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
    <html lang="en" className={saira.variable} suppressHydrationWarning>
      <body>
        {/* Sign-out goes straight to the public sign-in page, not the
            protected home route (which would stall on the auth gate). */}
        <ClerkProvider afterSignOutUrl="/sign-in">{children}</ClerkProvider>
      </body>
    </html>
  );
}
