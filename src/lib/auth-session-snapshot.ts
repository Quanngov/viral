const KEY = "viral_auth_snapshot_v1";

export type AuthSnapshot = { email: string };

export function readAuthSnapshot(): AuthSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as AuthSnapshot;
    return typeof o?.email === "string" && o.email ? o : null;
  } catch {
    return null;
  }
}

export function writeAuthSnapshot(email: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ email }));
  } catch {
    /* ignore */
  }
}

export function clearAuthSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
