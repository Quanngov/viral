import "server-only";

import { prisma } from "@/lib/prisma";

export const THUMB_FAIL_INVALID = 3;

export async function recordThumbnailFailure(platform: string, externalId: string) {
  const row = await prisma.video.update({
    where: { platform_externalId: { platform, externalId } },
    data: { thumbnailFailCount: { increment: 1 } },
    select: { id: true, thumbnailFailCount: true },
  });

  if (row.thumbnailFailCount >= THUMB_FAIL_INVALID) {
    await prisma.video.update({
      where: { id: row.id },
      data: { thumbnailStatus: "invalid" },
    });
    return { action: "invalid" as const, failCount: row.thumbnailFailCount };
  }

  return { action: "counted" as const, failCount: row.thumbnailFailCount };
}

export async function markThumbnailValid(platform: string, externalId: string) {
  await prisma.video.update({
    where: { platform_externalId: { platform, externalId } },
    data: { thumbnailStatus: "valid", thumbnailFailCount: 0 },
  });
}

/** HEAD check — for background batch only. */
export async function probeThumbnailUrl(url: string, timeoutMs = 4_000): Promise<boolean> {
  if (!url?.trim()) return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { method: "HEAD", signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    return res.ok && (res.headers.get("content-type")?.startsWith("image/") ?? true);
  } catch {
    return false;
  }
}

export async function runThumbnailCleanupBatch(limit = 20) {
  const candidates = await prisma.video.findMany({
    where: {
      thumbnailUrl: { not: null },
      thumbnailStatus: { not: "invalid" },
      thumbnailFailCount: { gte: 1 },
    },
    take: limit,
    select: { id: true, platform: true, externalId: true, thumbnailUrl: true, thumbnailFailCount: true },
  });

  let invalid = 0;
  for (const v of candidates) {
    const url = v.thumbnailUrl?.trim();
    if (!url) {
      await recordThumbnailFailure(v.platform, v.externalId);
      continue;
    }
    const ok = await probeThumbnailUrl(url);
    if (ok) {
      await markThumbnailValid(v.platform, v.externalId);
      continue;
    }
    const r = await recordThumbnailFailure(v.platform, v.externalId);
    if (r.action === "invalid") invalid++;
  }
  return { scanned: candidates.length, invalid };
}
