import Image from "next/image";

// Brand frame shared by the sign-in and sign-up pages: hero gradient, ECSESS
// logo, and the heading pair above Clerk's own card.
export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-start gap-5 overflow-y-auto px-4 py-6 lg:justify-center lg:gap-8 lg:p-12"
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
        <h1 className="text-2xl font-bold text-ecsess-50">{title}</h1>
        <p className="text-sm text-ecsess-300">{subtitle}</p>
      </div>
      <div className="w-full max-w-[400px]">{children}</div>
    </div>
  );
}
