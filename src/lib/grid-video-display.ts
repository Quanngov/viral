import type { GridVideo } from "@/lib/mock-data";

/** Cards that can render with thumbnail or YouTube fallback — never empty shells. */
export function isDisplayableHomeCard(v: GridVideo | null | undefined): boolean {
  if (!v?.id?.trim() || !v.title?.trim()) return false;
  if (v.thumbnailUrl?.trim()) return true;
  const plat = v.platform ?? (v.id.startsWith("instagram:") ? "instagram" : "youtube");
  const ext = v.externalId ?? v.youtubeId;
  return plat === "youtube" && Boolean(ext?.trim());
}

export function filterDisplayableVideos(videos: GridVideo[]): GridVideo[] {
  return videos.filter(isDisplayableHomeCard);
}
