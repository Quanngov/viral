export type VideoPlatform = "youtube" | "instagram";

export function videoClientId(platform: string, externalId: string): string {
  return `${platform}:${externalId}`;
}

export function parseVideoClientId(id: string): { platform: string; externalId: string } | null {
  const i = id.indexOf(":");
  if (i <= 0) return null;
  return { platform: id.slice(0, i), externalId: id.slice(i + 1) };
}
