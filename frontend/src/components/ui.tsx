// ============================================================
// ECSESS design-system UI primitives (Tailwind v4 + React).
// Single deep-forest-green ramp on a dark canvas. Sentence case.
// ============================================================
import Link from "next/link";
import type { ReactNode } from "react";

/* ---------------- Button ---------------- */
type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-ecsess-600 hover:bg-ecsess-700 text-ecsess-50 border border-transparent",
  secondary:
    "bg-ecsess-800 hover:bg-ecsess-700 text-ecsess-100 border border-transparent",
  outline:
    "bg-transparent hover:bg-ecsess-800 text-ecsess-200 border border-ecsess-600 hover:border-ecsess-400",
  ghost:
    "bg-transparent hover:bg-ecsess-800 text-ecsess-200 border border-transparent",
};
const BTN_SIZE: Record<ButtonSize, string> = {
  sm: "px-4 py-1.5 text-xs",
  md: "px-6 py-3 text-sm",
  lg: "px-7 py-3.5 text-base",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth,
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold leading-none
        transition-colors active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed
        ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${fullWidth ? "w-full" : "w-fit"} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------- Badge ---------------- */
type BadgeVariant = "upcoming" | "category" | "past" | "neutral" | "solid";
const BADGE_VARIANT: Record<BadgeVariant, string> = {
  upcoming: "bg-ecsess-500 text-white",
  category: "bg-ecsess-900/80 text-ecsess-300 backdrop-blur-sm",
  past: "bg-ecsess-950/75 text-ecsess-400 backdrop-blur-sm",
  neutral: "bg-ecsess-800 text-ecsess-200",
  solid: "bg-ecsess-600 text-ecsess-50",
};

export function Badge({
  children,
  variant = "category",
  live,
  pill,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  live?: boolean;
  pill?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold uppercase leading-none text-xs
        tracking-[0.2em] ${pill ? "rounded-full px-3.5 py-1.5" : "rounded-sm px-2 py-1"}
        ${BADGE_VARIANT[variant]}`}
    >
      {live && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current"
          style={{ animation: "ecsess-pulse-ring 1.5s ease-in-out infinite" }}
        />
      )}
      {children}
    </span>
  );
}

/* ---------------- Card ---------------- */
export function Card({
  children,
  variant = "solid",
  className = "",
}: {
  children: ReactNode;
  variant?: "solid" | "bordered";
  className?: string;
}) {
  const base =
    variant === "bordered"
      ? "bg-ecsess-950 border border-ecsess-800"
      : "bg-ecsess-800 border border-transparent";
  return (
    <div className={`rounded-xl shadow-md ${base} ${className}`}>
      {children}
    </div>
  );
}

/* ---------------- NavLink (black chrome bar) ---------------- */
export function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-6 py-2 text-sm font-semibold transition-colors border-b-4
        [text-shadow:0_1px_2px_rgb(0_0_0/0.4)]
        ${
          active
            ? "text-ecsess-100 border-ecsess-300"
            : "text-ecsess-200 border-transparent hover:text-ecsess-100 hover:border-ecsess-100"
        }`}
    >
      {children}
    </Link>
  );
}

/* ---------------- Avatar (initials fallback) ---------------- */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-ecsess-700 font-bold text-ecsess-150"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
