import { SignIn } from "@clerk/nextjs";
import AuthShell from "@/components/AuthShell";
import { AUTH_APPEARANCE } from "@/lib/authAppearance";

export default function SignInPage() {
  return (
    <AuthShell
      title="Sign in to the Games"
      subtitle="Use your McGill email to compete."
    >
      <SignIn appearance={AUTH_APPEARANCE} />
    </AuthShell>
  );
}
