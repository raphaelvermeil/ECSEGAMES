"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { X } from "@/components/icons";
import api from "@/lib/api";
import { NAV_LINKS } from "@/lib/nav";
import { teamLabel, type Team } from "@/lib/scores";

// Right-side slide-in drawer for mobile nav — the shared Navbar's link row
// is desktop-only (`hidden lg:flex`), so this is the only way to switch
// tabs on a phone. Used both by Navbar itself (every route except Schedule,
// where the shared bar is hidden in favor of ScheduleBanner's own merged
// header) and by ScheduleBanner directly.
export default function MobileNavMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);

  useEffect(() => {
    if (!open || team) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await api.get<{ team: Team }>("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setTeam(res.data.team);
      } catch {
        // Footer just omits the team line if this fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, team, getToken]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] lg:hidden">
      <div
        onClick={onClose}
        aria-hidden="true"
        className="animate-sched-fade absolute inset-0 bg-[rgba(4,9,7,.7)]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="animate-sched-slide absolute inset-y-0 right-0 flex w-[76%] max-w-xs flex-col border-l border-sched-accent-dim bg-sched-bg-raised"
      >
        <div className="flex flex-none items-center justify-between gap-3 bg-sched-band py-4 pl-[18px] pr-2 pt-5">
          <div className="flex items-center gap-[9px]">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-sched-accent-dim font-mono text-[10px] font-semibold tracking-[0.05em] text-sched-accent-dim">
              ECSE
            </div>
            <span className="font-display text-[15px] font-semibold tracking-[0.2em] text-sched-cream">
              GAMES
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-11 w-11 flex-none items-center justify-center text-sched-text-muted"
          >
            <X width={16} height={16} strokeWidth={2} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto">
          {NAV_LINKS.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname === link.href ||
                pathname.startsWith(link.href + "/");
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className="flex items-center gap-[14px] border-l-[3px] px-[18px] py-[14px]"
                style={{
                  borderLeftColor: active
                    ? "var(--color-sched-accent)"
                    : "transparent",
                  background: active ? "rgba(110,231,135,.06)" : "transparent",
                  color: active
                    ? "var(--color-sched-accent)"
                    : "var(--color-sched-text)",
                }}
              >
                <Icon
                  width={20}
                  height={20}
                  strokeWidth={1.8}
                  className="flex-none"
                />
                <span>
                  <span className="block font-mono text-sm font-medium">
                    {link.label}
                  </span>
                  <span className="mt-1 block font-mono text-[11px] leading-[1.5] text-sched-text-muted">
                    {link.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-none px-[18px] pb-10 pt-4 font-mono text-[10px] leading-[1.7] text-sched-text-muted">
          {user && (
            <>
              Signed in as {user.fullName ?? user.username ?? "you"}
              {team && (
                <>
                  <br />
                  Team {teamLabel(team)}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
