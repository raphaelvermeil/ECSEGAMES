import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import clerkNext from "@clerk/eslint-plugin/next";
import eslintConfigPrettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Enforce that every route resource guards itself with `await auth.protect()`.
  // All routes are protected except the auth pages, the (marketing) group
  // (the landing page) and the (public) group (schedule, sponsors, meet the
  // team) — all of which must stay reachable signed out.
  // The rule classifies by folder, not by file, which is why the landing page
  // lives in its own route group rather than sitting directly in src/app —
  // exempting it there would have exempted the whole app root.
  {
    plugins: { "@clerk/next": clerkNext },
    rules: {
      "@clerk/next/require-auth-protection": [
        "error",
        {
          protected: ["**"],
          public: [
            "src/app/sign-in/**",
            "src/app/sign-up/**",
            "src/app/(marketing)/**",
            "src/app/(public)/**",
          ],
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
