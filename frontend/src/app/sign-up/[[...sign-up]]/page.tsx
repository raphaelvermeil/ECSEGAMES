import { SignUp } from "@clerk/nextjs";
import AuthShell from "@/components/AuthShell";
import { AUTH_APPEARANCE } from "@/lib/authAppearance";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Join the Games"
      subtitle="Sign up with your McGill email and pick your team."
    >
      <SignUp appearance={AUTH_APPEARANCE} />
    </AuthShell>
  );
}
