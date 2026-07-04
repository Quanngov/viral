import {
  EMPTY_ONBOARDING_DRAFT,
  ONBOARDING_DISMISSED_KEY,
  ONBOARDING_DRAFT_KEY,
  ONBOARDING_SESSION_DEFER_KEY,
  type OnboardingDraft,
  type UserOnboardingProfileData,
} from "@/lib/onboarding/onboarding-types";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function isOnboardingDismissed(): boolean {
  if (!canUseStorage()) return true;
  return window.localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "1";
}

export function markOnboardingDismissed(): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ONBOARDING_DISMISSED_KEY, "1");
}

/** Close tour for this browser session — will show again on next visit. */
export function deferOnboardingThisSession(): void {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(ONBOARDING_SESSION_DEFER_KEY, "1");
}

export function isOnboardingDeferredThisSession(): boolean {
  if (!canUseStorage()) return false;
  return window.sessionStorage.getItem(ONBOARDING_SESSION_DEFER_KEY) === "1";
}

export function shouldShowOnboarding(): boolean {
  return !isOnboardingDismissed() && !isOnboardingDeferredThisSession();
}

export function resetOnboardingLocal(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
  window.localStorage.removeItem(ONBOARDING_DRAFT_KEY);
  window.sessionStorage.removeItem(ONBOARDING_SESSION_DEFER_KEY);
}

export function readOnboardingDraft(): OnboardingDraft {
  if (!canUseStorage()) return { ...EMPTY_ONBOARDING_DRAFT };
  try {
    const raw = window.localStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (!raw) return { ...EMPTY_ONBOARDING_DRAFT };
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
    return {
      instagramUsername: String(parsed.instagramUsername ?? "").trim(),
      tiktokUsername: String(parsed.tiktokUsername ?? "").trim(),
      youtubeChannel: String(parsed.youtubeChannel ?? "").trim(),
      creatorType: String(parsed.creatorType ?? "").trim(),
      contentNiches: Array.isArray(parsed.contentNiches)
        ? parsed.contentNiches.map((n) => String(n).trim()).filter(Boolean)
        : [],
      referenceLinks: String(parsed.referenceLinks ?? "").trim(),
    };
  } catch {
    return { ...EMPTY_ONBOARDING_DRAFT };
  }
}

export function writeOnboardingDraft(draft: OnboardingDraft): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
}

export function parseReferenceLinks(text: string): string[] {
  return text
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 12);
}

export function draftToProfilePayload(
  draft: OnboardingDraft,
  markDone: boolean,
): Omit<UserOnboardingProfileData, "onboardingDoneAt"> & { markOnboardingDone?: boolean } {
  return {
    instagramUsername: draft.instagramUsername,
    tiktokUsername: draft.tiktokUsername,
    youtubeChannel: draft.youtubeChannel,
    creatorType: draft.creatorType,
    contentNiches: draft.contentNiches,
    referenceLinks: parseReferenceLinks(draft.referenceLinks),
    markOnboardingDone: markDone,
  };
}

export function profileToDraft(profile: UserOnboardingProfileData): OnboardingDraft {
  return {
    instagramUsername: profile.instagramUsername,
    tiktokUsername: profile.tiktokUsername,
    youtubeChannel: profile.youtubeChannel,
    creatorType: profile.creatorType,
    contentNiches: profile.contentNiches,
    referenceLinks: profile.referenceLinks.join("\n"),
  };
}

/** Dev / QA: `?resetOnboarding=1` clears local flag. */
export function maybeResetOnboardingFromQuery(): void {
  if (!canUseStorage()) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get("resetOnboarding") === "1") {
    resetOnboardingLocal();
    params.delete("resetOnboarding");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", next);
  }
}
