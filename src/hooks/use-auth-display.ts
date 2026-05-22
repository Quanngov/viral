"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  clearAuthSnapshot,
  readAuthSnapshot,
  writeAuthSnapshot,
  type AuthSnapshot,
} from "@/lib/auth-session-snapshot";

/** Avoid guest ↔ authed flash while SessionProvider hydrates. */
export function useAuthDisplay() {
  const { data: session, status } = useSession();
  const [hint, setHint] = useState<AuthSnapshot | null>(null);

  useEffect(() => {
    setHint(readAuthSnapshot());
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      writeAuthSnapshot(session.user.email);
      setHint({ email: session.user.email });
    } else if (status === "unauthenticated") {
      clearAuthSnapshot();
      setHint(null);
    }
  }, [status, session?.user?.email]);

  const loading = status === "loading";
  const showAuthed = status === "authenticated" || (loading && hint !== null);
  const showGuest = status === "unauthenticated";
  const showAuthPlaceholder = loading && hint === null;
  const displayEmail = session?.user?.email ?? hint?.email ?? "";

  return {
    showAuthed,
    showGuest,
    showAuthPlaceholder,
    sessionLoading: loading,
    displayEmail,
  };
}
