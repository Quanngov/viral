import "server-only";

import { fetchInstagramReelByCodeFromTikHub } from "@/lib/providers/tikhubInstagram";
import { prisma } from "@/lib/prisma";

export type ThumbnailRecoveryResult =
  | { ok: true; thumbnailUrl: string }
  | { ok: false; reason: "not_found" | "no_thumb" | "tikhub_error" };

/**
 * Refresh Instagram thumbnailUrl from TikHub (signed CDN URLs expire in days).
 */
export async function recoverInstagramThumbnail(
  externalId: string,
  reelUrl?: string | null,
): Promise<ThumbnailRecoveryResult> {
  const code = externalId.trim();
  if (!code) return { ok: false, reason: "not_found" };

  const reel = await fetchInstagramReelByCodeFromTikHub(code, reelUrl?.trim() || null);
  if (!reel) return { ok: false, reason: "tikhub_error" };

  const thumb = reel.thumbnailUrl?.trim();
  if (!thumb) return { ok: false, reason: "no_thumb" };

  await prisma.video.update({
    where: { platform_externalId: { platform: "instagram", externalId: code } },
    data: {
      thumbnailUrl: thumb,
      thumbnailStatus: "valid",
      thumbnailFailCount: 0,
      lastFetchedAt: new Date(),
      url: reel.url,
      ...(reel.videoUrl ? { videoUrl: reel.videoUrl } : {}),
      ...(reel.usefulRaw ? { usefulRaw: reel.usefulRaw } : {}),
    },
  });

  return { ok: true, thumbnailUrl: thumb };
}
