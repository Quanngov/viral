import type { GridVideo } from "@/lib/mock-data";
import {
  hasResolvableThumbnail,
  isDisplayableThumbnailUrl,
  resolveThumbnailUrl,
} from "@/lib/video-thumbnail";

/** Cards/lists: must have title + resolvable thumbnail source. */
export function isDisplayableHomeCard(v: GridVideo | null | undefined): boolean {
  if (!v?.id?.trim() || !v.title?.trim()) return false;
  return hasResolvableThumbnail(v.platform, v.externalId ?? v.youtubeId, v.thumbnailUrl, v.id);
}

export function filterDisplayableVideos(videos: GridVideo[]): GridVideo[] {
  return videos.filter(isDisplayableHomeCard);
}

/** Ensure serialized cards always carry resolved primary thumb URL. */
export function withResolvedThumbnail<T extends GridVideo>(video: T): T {
  const thumb = resolveThumbnailUrl(
    video.platform,
    video.externalId ?? video.youtubeId,
    video.thumbnailUrl,
    video.id,
  );
  return { ...video, thumbnailUrl: thumb };
}

export function filterAndResolveDisplayableVideos(videos: GridVideo[]): GridVideo[] {
  return filterDisplayableVideos(videos).map(withResolvedThumbnail);
}

/** Fill exactly `limit` items from an ordered pool that pass `predicate`. */
export function fillDisplayableFromPool<T>(pool: T[], limit: number, predicate: (item: T) => boolean): T[] {
  const out: T[] = [];
  for (const item of pool) {
    if (!predicate(item)) continue;
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

/** Fill exactly `limit` displayable videos from an ordered pool (search/home/feed). */
export function fillDisplayableVideos(pool: GridVideo[], limit: number): GridVideo[] {
  const out: GridVideo[] = [];
  for (const v of pool) {
    if (!isDisplayableHomeCard(v)) continue;
    out.push(withResolvedThumbnail(v));
    if (out.length >= limit) break;
  }
  return out;
}

export type TrendVideoLike = {
  id: string;
  platform?: string;
  thumbnailUrl?: string;
  title?: string;
};

export function isDisplayableTrendVideo(v: TrendVideoLike | null | undefined): boolean {
  if (!v?.id?.trim() || !v.title?.trim()) return false;
  return hasResolvableThumbnail(v.platform, null, v.thumbnailUrl, v.id);
}

export function withResolvedTrendThumbnail<T extends TrendVideoLike>(video: T): T {
  const thumb = resolveThumbnailUrl(video.platform, null, video.thumbnailUrl, video.id);
  if (!isDisplayableThumbnailUrl(thumb)) return video;
  return { ...video, thumbnailUrl: thumb };
}
