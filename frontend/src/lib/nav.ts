import type { ComponentType, SVGProps } from "react";
import {
  Briefcase,
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
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const NAV_LINKS: NavLink[] = [
  {
    href: "/",
    label: "Home",
    exact: true,
    description: "Coming soon.",
    icon: House,
  },
  {
    href: "/schedule",
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
    label: "Sponsors",
    description: "Coming soon.",
    icon: Briefcase,
  },
  {
    href: "/meet-the-team",
    label: "Meet the team",
    description: "Coming soon.",
    icon: Users,
  },
];
