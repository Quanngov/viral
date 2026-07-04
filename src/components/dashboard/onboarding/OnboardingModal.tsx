"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import {
  EMPTY_ONBOARDING_DRAFT,
  ONBOARDING_INTRO_STEPS,
  type OnboardingDraft,
} from "@/lib/onboarding/onboarding-types";
import type { OnboardingPreviewData } from "@/lib/onboarding/onboarding-preview-data";
import {
  deferOnboardingThisSession,
  draftToProfilePayload,
  markOnboardingDismissed,
  readOnboardingDraft,
  writeOnboardingDraft,
} from "@/lib/onboarding/onboarding-storage";
import { saveUserProfile } from "@/lib/onboarding/user-profile-client";
import { useAuthGate } from "@/components/dashboard/AuthGateProvider";
import { OnboardingProductPreviews } from "@/components/dashboard/onboarding/OnboardingProductPreviews";
import { OnboardingWorkspaceStep } from "@/components/dashboard/onboarding/OnboardingWorkspaceStep";
import { OnboardingSignupStep } from "@/components/dashboard/onboarding/OnboardingSignupStep";

import "./onboarding.css";

const emptySubscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

type OnboardingModalProps = {
  open: boolean;
  onClose: () => void;
  previewData: OnboardingPreviewData;
};

const FEATURE_COUNT = ONBOARDING_INTRO_STEPS.length;
const WORKSPACE_STEP = FEATURE_COUNT;
const SIGNUP_STEP = FEATURE_COUNT + 1;
const TOTAL_STEPS = SIGNUP_STEP + 1;

export function OnboardingModal({ open, onClose, previewData }: OnboardingModalProps) {
  const hydrated = useHydrated();
  const titleId = useId();
  const { openAuth } = useAuthGate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_ONBOARDING_DRAFT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setDraft(readOnboardingDraft());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const deferTour = useCallback(() => {
    deferOnboardingThisSession();
    onClose();
  }, [onClose]);

  const skipTour = useCallback(() => {
    markOnboardingDismissed();
    writeOnboardingDraft(draft);
    onClose();
  }, [draft, onClose]);

  const persistProfile = useCallback(
    async (markDone: boolean) => {
      writeOnboardingDraft(draft);
      try {
        await saveUserProfile(draftToProfilePayload(draft, markDone));
      } catch {
        /* local draft persists */
      }
    },
    [draft],
  );

  const goNext = useCallback(() => {
    writeOnboardingDraft(draft);
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    }
  }, [draft, step]);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const skipWorkspace = useCallback(() => {
    writeOnboardingDraft(draft);
    setStep(SIGNUP_STEP);
  }, [draft]);

  const handleCreateAccount = useCallback(async () => {
    setSaving(true);
    markOnboardingDismissed();
    await persistProfile(true);
    setSaving(false);
    openAuth("signup");
    onClose();
  }, [persistProfile, openAuth, onClose]);

  const handleBrowseGuest = useCallback(async () => {
    setSaving(true);
    markOnboardingDismissed();
    await persistProfile(false);
    setSaving(false);
    onClose();
  }, [persistProfile, onClose]);

  if (!hydrated || !open) return null;

  const isFeature = step < FEATURE_COUNT;
  const isWorkspace = step === WORKSPACE_STEP;
  const isSignup = step === SIGNUP_STEP;
  const feature = isFeature ? ONBOARDING_INTRO_STEPS[step] : null;
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const node = (
    <div className="onboarding-root fixed inset-0 z-[240]" role="presentation">
      <button
        type="button"
        aria-label="Закрыть тур"
        className="onboarding-backdrop absolute inset-0 bg-zinc-950/45 backdrop-blur-[5px]"
        onClick={deferTour}
      />
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div
          role="dialog"
          aria-modal
          aria-labelledby={titleId}
          className="onboarding-panel pointer-events-auto flex max-h-[min(92dvh,840px)] w-full max-w-[min(94vw,440px)] flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-2xl shadow-zinc-900/15 md:max-w-[min(90vw,800px)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-1 shrink-0 bg-zinc-100">
            <div
              className="h-full bg-emerald-500 transition-[width] duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="shrink-0 border-b border-zinc-100 px-5 py-3 md:px-7">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-emerald-800">Добро пожаловать в ViralCloud</p>
              <p className="text-[11px] font-medium text-zinc-400">
                {step + 1}/{TOTAL_STEPS}
              </p>
            </div>
            <div className="mt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={deferTour}
                className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800"
              >
                Посмотреть позже
              </button>
              <button
                type="button"
                onClick={skipTour}
                className="text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-600"
              >
                Пропустить тур
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-4 md:px-7 md:pb-5">
            <div key={step} className="onboarding-step">
              {isSignup ? (
                <OnboardingSignupStep
                  titleId={titleId}
                  onCreateAccount={() => void handleCreateAccount()}
                  onBrowseGuest={() => void handleBrowseGuest()}
                  busy={saving}
                />
              ) : isWorkspace ? (
                <OnboardingWorkspaceStep draft={draft} onChange={setDraft} titleId={titleId} />
              ) : feature ? (
                <div className="md:grid md:grid-cols-[0.95fr_1.15fr] md:items-start md:gap-8">
                  <div>
                    <h2 id={titleId} className="text-xl font-semibold tracking-tight text-zinc-900 md:text-2xl">
                      {feature.title}
                    </h2>
                    <p className="mt-2.5 text-sm leading-relaxed text-zinc-600">{feature.description}</p>
                    {feature.detail ? (
                      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{feature.detail}</p>
                    ) : null}
                  </div>
                  <div className="mt-5 md:mt-0">
                    <OnboardingProductPreviews step={feature} data={previewData} />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {!isSignup ? (
            <div className="flex shrink-0 items-center gap-2 border-t border-zinc-100 px-5 py-4 md:px-7">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0 || saving}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40"
              >
                Назад
              </button>
              {isWorkspace ? (
                <button
                  type="button"
                  onClick={skipWorkspace}
                  disabled={saving}
                  className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-700 disabled:opacity-50"
                >
                  Пропустить
                </button>
              ) : null}
              <button
                type="button"
                onClick={goNext}
                disabled={saving}
                className="ml-auto rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
              >
                Далее
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
