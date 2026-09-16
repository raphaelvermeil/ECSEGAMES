import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import clerkNext from "@clerk/eslint-plugin/next";
import eslintConfigPrettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Enforce that protected route resources guard themselves with
  // `await auth.protect()`.
  //
  // Most of the app is public: the schedule, standings, sponsors and team
  // pages are readable without an account, and the backend enforces the same
  // split (GET /api/events and /api/leaderboard are unauthenticated; writes,
  // scores, event history and the whole CS comp surface are not). What stays
  // protected is the CS comp and onboarding — everything that writes against
  // a real user.
  //
  // The exec controls on the schedule are *not* listed here on purpose. They
  // are gated by role rather than by route, in the Go handlers; the
  // canManage flag on the page only decides whether to draw the buttons.
  {
    plugins: { "@clerk/next": clerkNext },
    rules: {
      "@clerk/next/require-auth-protection": [
        "error",
        {
          protected: [
            "src/app/(app)/cs-comp/**",
            "src/app/(app)/leaderboard/**",
            "src/app/select-team/**",
          ],
          public: ["**"],
        },
      ],
    },
  },
  // Disable ESLint rules that conflict with Prettier (must be last).
  eslintConfigPrettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
