import type { ComponentType, SVGProps } from "react";
import {
  Briefcase,
  CalendarDays,
  CodeXml,
  Trophy,
  Users,
} from "@/components/icons";

export interface NavLink {
  href: string;
  label: string;
  exact?: boolean;
  // Mobile menu only — the desktop nav bar just shows the label.
  description: string;
  // Reachable without a session. Signed-out visitors see only these; the
  // rest are hidden rather than shown and then bounced to sign-in.
  public?: boolean;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const NAV_LINKS: NavLink[] = [
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
    description: "Coming soon.",
    icon: CodeXml,
  },
  {
    href: "/leaderboard",
    label: "Leaderboard",
    description: "Coming soon.",
    icon: Trophy,
  },
  {
    href: "/sponsors",
    public: true,
    label: "Sponsors",
    description: "Coming soon.",
    icon: Briefcase,
  },
  {
    href: "/meet-the-team",
    public: true,
    label: "Meet the team",
    description: "The crews behind ECSE Games.",
    icon: Users,
  },
];
