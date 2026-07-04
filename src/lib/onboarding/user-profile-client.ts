import type { UserOnboardingProfileData } from "@/lib/onboarding/onboarding-types";
import type { OnboardingDraft } from "@/lib/onboarding/onboarding-types";
import { draftToProfilePayload } from "@/lib/onboarding/onboarding-storage";

export async function fetchUserProfile(): Promise<UserOnboardingProfileData | null> {
  try {
    const res = await fetch("/api/user/profile", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { profile?: UserOnboardingProfileData };
    return data.profile ?? null;
  } catch {
    return null;
  }
}

export async function saveUserProfile(
  payload: ReturnType<typeof draftToProfilePayload> | Partial<UserOnboardingProfileData> & { markOnboardingDone?: boolean },
): Promise<UserOnboardingProfileData | null> {
  const res = await fetch("/api/user/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { profile?: UserOnboardingProfileData };
  return data.profile ?? null;
}

export async function saveProfileFromDraft(draft: OnboardingDraft, markDone = false) {
  return saveUserProfile(draftToProfilePayload(draft, markDone));
}
