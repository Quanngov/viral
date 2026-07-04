"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuthDisplay } from "@/hooks/use-auth-display";
import { AuthModal, type AuthModalMode } from "@/components/dashboard/AuthModal";
import { RegistrationGateModal } from "@/components/dashboard/onboarding/RegistrationGateModal";
import { readOnboardingDraft } from "@/lib/onboarding/onboarding-storage";
import { saveProfileFromDraft } from "@/lib/onboarding/user-profile-client";
import type { RegistrationAction } from "@/lib/onboarding/onboarding-types";

export type RegistrationResumeFn = () => void | Promise<unknown>;

type AuthGateContextValue = {
  isRegistered: boolean;
  ensureRegistered: (action: RegistrationAction, resume?: RegistrationResumeFn) => boolean;
  openAuth: (mode?: AuthModalMode) => void;
};

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function AuthGateProvider({
  children,
  onAuthSuccess,
}: {
  children: ReactNode;
  onAuthSuccess?: () => void;
}) {
  const { showAuthed } = useAuthDisplay();
  const [gateOpen, setGateOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthModalMode>("signup");
  const pendingResumeRef = useRef<RegistrationResumeFn | null>(null);

  const clearPending = useCallback(() => {
    pendingResumeRef.current = null;
  }, []);

  const openAuth = useCallback((mode: AuthModalMode = "signup") => {
    setGateOpen(false);
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);

  const ensureRegistered = useCallback(
    (action: RegistrationAction, resume?: RegistrationResumeFn) => {
      if (showAuthed) return true;
      pendingResumeRef.current = resume ?? null;
      setGateOpen(true);
      return false;
    },
    [showAuthed],
  );

  useEffect(() => {
    if (!showAuthed || !pendingResumeRef.current) return;
    const resume = pendingResumeRef.current;
    pendingResumeRef.current = null;
    void Promise.resolve(resume());
  }, [showAuthed]);

  const value = useMemo(
    () => ({
      isRegistered: showAuthed,
      ensureRegistered,
      openAuth,
    }),
    [showAuthed, ensureRegistered, openAuth],
  );

  return (
    <AuthGateContext.Provider value={value}>
      {children}
      <RegistrationGateModal
        open={gateOpen}
        onClose={() => {
          setGateOpen(false);
          clearPending();
        }}
        onSignUp={() => openAuth("signup")}
        onLogin={() => openAuth("login")}
      />
      <AuthModal
        open={authOpen}
        onClose={() => {
          setAuthOpen(false);
          clearPending();
        }}
        mode={authMode}
        onSuccess={() => {
          void saveProfileFromDraft(readOnboardingDraft(), true);
          onAuthSuccess?.();
        }}
      />
    </AuthGateContext.Provider>
  );
}

export function useAuthGate() {
  const ctx = useContext(AuthGateContext);
  if (!ctx) {
    throw new Error("useAuthGate must be used within AuthGateProvider");
  }
  return ctx;
}

export function useAuthGateOptional() {
  return useContext(AuthGateContext);
}
