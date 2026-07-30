import { SignIn } from "@clerk/nextjs";
import Image from "next/image";

// Clerk's <SignIn/> themed to the ECSESS dark green palette via the
// appearance prop, wrapped in the brand hero gradient.
export default function SignInPage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-8 p-12"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <Image
          src="/logo.png"
          alt="ECSESS"
          width={160}
          height={40}
          className="h-9 w-auto"
          priority
        />
        <h1 className="text-2xl font-bold text-ecsess-50">
          Sign in to the Games
        </h1>
        <p className="text-sm text-ecsess-300">
          Use your McGill email to compete.
        </p>
      </div>
      <SignIn
        appearance={{
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
            card: "bg-ecsess-800 border border-ecsess-700 shadow-2xl",
            headerTitle: "text-ecsess-50",
            formButtonPrimary:
              "bg-ecsess-600 hover:bg-ecsess-700 text-ecsess-50",
            footerActionLink: "text-ecsess-150 hover:text-ecsess-50",
            // White Microsoft SSO button (covers block + icon variants).
            socialButtonsBlockButton__microsoft:
              "!bg-white !text-gray-800 hover:!bg-gray-50 !border !border-gray-300",
            socialButtonsIconButton__microsoft:
              "!bg-white hover:!bg-gray-50 !border !border-gray-300",
          },
        }}
      />
    </div>
  );
}
