import type { ComponentType, SVGProps } from "react";
import {
  CalendarDays,
  CodeXml,
  House,
  Trophy,
  Users,
} from "@/components/icons";

export interface NavLink {
  href: string;
  label: string;
  exact?: boolean;
  // Mobile menu only — the desktop nav bar just shows the label.
  description: string;
  // Reachable without a session. Signed-out visitors see only these in the
  // nav; the rest are hidden rather than shown and then bounced to sign-in.
  public?: boolean;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const NAV_LINKS: NavLink[] = [
  {
    href: "/",
    public: true,
    label: "Home",
    exact: true,
    description: "The Games, in brief.",
    icon: House,
  },
  {
    href: "/schedule",
    public: true,
    label: "Schedule",
    description: "All three days, event by event.",
    icon: CalendarDays,
  },
  {
    href: "/cs-comp",
    label: "CS comp",
    description: "In-house CSS battle — teams of 5.",
    icon: CodeXml,
  },
  {
    href: "/leaderboard",
    label: "Leaderboard",
    description: "Coming soon.",
    icon: Trophy,
  },
  {
    href: "/meet-the-team",
    public: true,
    label: "Meet the team",
    description: "The crews behind ECSE Games.",
    icon: Users,
  },
];
