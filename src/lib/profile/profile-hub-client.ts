import type { ProfileHubPayload } from "@/lib/profile/profile-types";

export type ProfileHubFetchResult =
  | { ok: true; hub: ProfileHubPayload }
  | { ok: false; status: number; error: string; message: string };

async function parseHubResponse(res: Response): Promise<ProfileHubFetchResult> {
  let body: { hub?: ProfileHubPayload; error?: string; message?: string } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    body = {};
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: body.error ?? "request_failed",
      message: body.message ?? `Ошибка ${res.status}`,
    };
  }

  if (!body.hub) {
    return {
      ok: false,
      status: res.status,
      error: "empty_payload",
      message: "Сервер вернул пустой ответ профиля.",
    };
  }

  return { ok: true, hub: body.hub };
}

export async function fetchProfileHub(): Promise<ProfileHubFetchResult> {
  try {
    const res = await fetch("/api/user/profile/hub", { cache: "no-store" });
    return parseHubResponse(res);
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: "network_error",
      message: error instanceof Error ? error.message : "Сеть недоступна",
    };
  }
}

export async function refreshProfileHub(): Promise<ProfileHubFetchResult> {
  try {
    const res = await fetch("/api/user/profile/refresh", { method: "POST" });
    return parseHubResponse(res);
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: "network_error",
      message: error instanceof Error ? error.message : "Сеть недоступна",
    };
  }
}

export async function saveSocialAccount(
  platform: import("@/lib/profile/profile-types").SocialPlatform,
  username: string,
): Promise<ProfileHubFetchResult> {
  try {
    const res = await fetch("/api/user/profile/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, username }),
    });
    const result = await parseHubResponse(res);
    if (result.ok && typeof window !== "undefined") {
      const { invalidateDashboardHomeCache } = await import("@/lib/dashboard-home-client");
      invalidateDashboardHomeCache();
    }
    return result;
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: "network_error",
      message: error instanceof Error ? error.message : "Сеть недоступна",
    };
  }
}

export async function removeSocialAccountClient(
  platform: import("@/lib/profile/profile-types").SocialPlatform,
): Promise<ProfileHubFetchResult> {
  try {
    const res = await fetch(`/api/user/profile/social?platform=${platform}`, { method: "DELETE" });
    const result = await parseHubResponse(res);
    if (result.ok && typeof window !== "undefined") {
      const { invalidateDashboardHomeCache } = await import("@/lib/dashboard-home-client");
      invalidateDashboardHomeCache();
    }
    return result;
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: "network_error",
      message: error instanceof Error ? error.message : "Сеть недоступна",
    };
  }
}

export async function saveProfileSettings(
  draft: import("@/lib/onboarding/onboarding-types").OnboardingDraft,
): Promise<ProfileHubFetchResult> {
  const { saveProfileFromDraft } = await import("@/lib/onboarding/user-profile-client");
  const saved = await saveProfileFromDraft(draft, true);
  if (!saved) {
    return {
      ok: false,
      status: 400,
      error: "save_failed",
      message: "Не удалось сохранить настройки профиля.",
    };
  }
  return fetchProfileHub();
}

export async function requestAiProfileAnalysis(): Promise<{
  ok: boolean;
  message: string;
  tokenCost?: number;
}> {
  const res = await fetch("/api/user/profile/ai-analysis", { method: "POST" });
  const data = (await res.json()) as {
    message?: string;
    error?: string;
    tokenCost?: number;
  };
  return {
    ok: res.ok,
    message: data.message ?? data.error ?? "unknown",
    tokenCost: data.tokenCost,
  };
}
