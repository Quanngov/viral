/**
 * Global thumbnail resolution for ViralCloud.
 * Client-safe — no server-only imports.
 */

export const VIRAL_THUMBNAIL_PLACEHOLDER = "/viral-logo.png";

export type ThumbnailPlatform = "youtube" | "instagram" | "tiktok" | string;

export function youtubeThumbnailUrl(externalId: string): string {
  const id = externalId.trim();
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function normalizePlatform(
  platform: string | undefined,
  clientId?: string,
): ThumbnailPlatform {
  if (platform === "tiktok") return "tiktok";
  if (platform === "instagram" || clientId?.startsWith("instagram:")) return "instagram";
  if (platform === "youtube" || clientId?.startsWith("youtube:")) return "youtube";
  return platform ?? "youtube";
}

export function resolveExternalIdFromClientId(clientId: string): string | null {
  const colon = clientId.indexOf(":");
  if (colon > 0) return clientId.slice(colon + 1).trim() || null;
  return null;
}

/** Whether the video can be shown in lists (has a resolvable thumb source). */
export function hasResolvableThumbnail(
  platform: string | undefined,
  externalId: string | null | undefined,
  storedUrl?: string | null,
  clientId?: string,
): boolean {
  const plat = normalizePlatform(platform, clientId);
  const ext = externalId?.trim() || (clientId ? resolveExternalIdFromClientId(clientId) : null);
  if (!ext && plat !== "youtube") return false;
  if (storedUrl?.trim()) return true;
  return plat === "youtube" && Boolean(ext);
}

/** Primary display URL from stored data (never the placeholder — use VideoThumbnail for fallback). */
export function resolveThumbnailUrl(
  platform: string | undefined,
  externalId: string | null | undefined,
  storedUrl?: string | null,
  clientId?: string,
): string {
  const raw = storedUrl?.trim();
  if (raw) return raw;
  const plat = normalizePlatform(platform, clientId);
  const ext = externalId?.trim() || (clientId ? resolveExternalIdFromClientId(clientId) : null);
  if (plat === "youtube" && ext) return youtubeThumbnailUrl(ext);
  return "";
}

export function isDisplayableThumbnailUrl(url: string | null | undefined): boolean {
  return Boolean(url?.trim());
}
