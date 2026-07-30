import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp
        appearance={{
          elements: {
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
