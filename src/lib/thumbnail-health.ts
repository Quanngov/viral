import "server-only";

import { prisma } from "@/lib/prisma";
import { recoverInstagramThumbnail } from "@/lib/thumbnail-recovery";

export const THUMB_FAIL_INVALID = 3;

export type ThumbnailFailureResult =
  | { action: "recovered"; thumbnailUrl: string; failCount: 0 }
  | { action: "counted"; failCount: number }
  | { action: "invalid"; failCount: number };

export async function recordThumbnailFailure(
  platform: string,
  externalId: string,
  opts?: { skipRecovery?: boolean },
): Promise<ThumbnailFailureResult> {
  if (platform === "instagram" && !opts?.skipRecovery) {
    const row = await prisma.video.findUnique({
      where: { platform_externalId: { platform, externalId } },
      select: { url: true, thumbnailFailCount: true },
    });
    const recovered = await recoverInstagramThumbnail(externalId, row?.url);
    if (recovered.ok) {
      return { action: "recovered", thumbnailUrl: recovered.thumbnailUrl, failCount: 0 };
    }
  }

  const updated = await prisma.video.update({
    where: { platform_externalId: { platform, externalId } },
    data: { thumbnailFailCount: { increment: 1 } },
    select: { id: true, thumbnailFailCount: true },
  });

  if (updated.thumbnailFailCount >= THUMB_FAIL_INVALID) {
    await prisma.video.update({
      where: { id: updated.id },
      data: { thumbnailStatus: "invalid" },
    });
    return { action: "invalid", failCount: updated.thumbnailFailCount };
  }

  return { action: "counted", failCount: updated.thumbnailFailCount };
}

export async function markThumbnailValid(platform: string, externalId: string) {
  await prisma.video.update({
    where: { platform_externalId: { platform, externalId } },
    data: { thumbnailStatus: "valid", thumbnailFailCount: 0 },
  });
}

/** HEAD check — YouTube/stable hosts only; IG CDN often 403 from server. */
export async function probeThumbnailUrl(url: string, timeoutMs = 4_000): Promise<boolean> {
  if (!url?.trim()) return false;
  try {
    const host = new URL(url).hostname;
    if (host.includes("cdninstagram.com") || host.includes("fbcdn.net")) {
      return false;
    }
  } catch {
    return false;
  }
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
      NOT: { thumbnailStatus: "invalid" },
      OR: [
        { thumbnailFailCount: { gte: 1 } },
        {
          platform: "instagram",
          lastFetchedAt: { lt: new Date(Date.now() - 5 * 86400_000) },
        },
      ],
    },
    take: limit,
    orderBy: [{ thumbnailFailCount: "desc" }, { lastFetchedAt: "asc" }],
    select: {
      id: true,
      platform: true,
      externalId: true,
      thumbnailUrl: true,
      thumbnailFailCount: true,
      url: true,
    },
  });

  let invalid = 0;
  let recovered = 0;

  for (const v of candidates) {
    const url = v.thumbnailUrl?.trim();
    if (!url) {
      await recordThumbnailFailure(v.platform, v.externalId);
      continue;
    }

    if (v.platform === "instagram") {
      const r = await recoverInstagramThumbnail(v.externalId, v.url);
      if (r.ok) {
        recovered++;
        continue;
      }
      const fail = await recordThumbnailFailure(v.platform, v.externalId, { skipRecovery: true });
      if (fail.action === "invalid") invalid++;
      continue;
    }

    const ok = await probeThumbnailUrl(url);
    if (ok) {
      await markThumbnailValid(v.platform, v.externalId);
      continue;
    }
    const fail = await recordThumbnailFailure(v.platform, v.externalId);
    if (fail.action === "invalid") invalid++;
  }

  return { scanned: candidates.length, invalid, recovered };
}
