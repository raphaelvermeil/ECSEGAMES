"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import api from "@/lib/api";

// The signed-in user's role, or null while it is still unknown.
//
// Resolved in the browser rather than in the (app) layout on purpose: that
// layout deliberately makes no request-time auth call, because one there
// would opt every route in the group into per-request rendering. The nav is
// the only thing that needs the role globally, and it can fill in a moment
// late without affecting what renders.
//
// A failed lookup leaves this null, which hides exec-only links — the safe
// direction. The pages behind those links gate themselves server-side
// anyway, so this only decides what is worth showing.
export function useRole(): string | null {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ role: string }>("/api/me", {
          headers: { Authorization: `Bearer ${await getToken()}` },
        });
        if (!cancelled) setRole(res.data.role);
      } catch {
        // Stay null — the caller treats unknown as "not an exec".
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  return role;
}

// isExec is the single place the two privileged roles are spelled out, so a
// third role later doesn't mean hunting for string comparisons.
export function isExec(role: string | null): boolean {
  return role === "exec" || role === "admin";
}
