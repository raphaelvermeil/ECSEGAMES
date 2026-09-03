import type { ComponentProps } from "react";
import type { SignIn } from "@clerk/nextjs";

// @clerk/types isn't a direct dependency, so the appearance type is taken
// from the component that consumes it. Note the two halves check
// differently: a typo under `variables` is a build error, while `elements`
// accepts any key (Clerk allows arbitrary element descriptors) — so a
// misspelled element name there fails silently at runtime.
type AuthAppearance = NonNullable<ComponentProps<typeof SignIn>["appearance"]>;

// Shared Clerk theming for the sign-in and sign-up pages. It lives here
// rather than inline in each page because the two must look identical, and
// when this config was duplicated the sign-up page silently kept Clerk's
// default black-and-white theme while sign-in was styled.
export const AUTH_APPEARANCE: AuthAppearance = {
  variables: {
    colorPrimary: "#3f6a3f",
    colorBackground: "#0a3d2a",
    colorForeground: "#cce7ba",
    colorMutedForeground: "#8fb98a",
    colorInput: "#031c15",
    colorInputForeground: "#e8ffd9",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-saira), Saira, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    card: "bg-ecsess-800 border border-ecsess-700 shadow-2xl w-full",
    headerTitle: "text-ecsess-50",
    formButtonPrimary: "bg-ecsess-600 hover:bg-ecsess-700 text-ecsess-50",
    footerActionLink: "text-ecsess-150 hover:text-ecsess-50",
    // White Microsoft SSO button (covers block + icon variants).
    socialButtonsBlockButton__microsoft:
      "!bg-white !text-gray-800 hover:!bg-gray-50 !border !border-gray-300",
    socialButtonsIconButton__microsoft:
      "!bg-white hover:!bg-gray-50 !border !border-gray-300",
  },
};
