import type { Prisma } from "@prisma/client";
import type { Video } from "@prisma/client";
import { hasResolvableThumbnail } from "@/lib/video-thumbnail";

/** Prisma filter: only videos with a displayable thumbnail policy. */
export const DISPLAYABLE_THUMBNAIL_VIDEO_WHERE: Prisma.VideoWhereInput = {
  NOT: { thumbnailStatus: "invalid" },
  OR: [
    { platform: "youtube" },
    {
      AND: [
        { platform: "instagram" },
        { thumbnailUrl: { not: null } },
        { NOT: { thumbnailUrl: "" } },
        { thumbnailFailCount: { lt: 3 } },
      ],
    },
  ],
};

export function videoRowHasDisplayableThumbnail(v: {
  platform: string;
  externalId: string;
  thumbnailUrl: string | null;
  thumbnailStatus?: string | null;
  thumbnailFailCount?: number | null;
}): boolean {
  if (v.thumbnailStatus === "invalid") return false;
  if (v.platform === "instagram" && (v.thumbnailFailCount ?? 0) >= 3) return false;
  return hasResolvableThumbnail(v.platform, v.externalId, v.thumbnailUrl);
}

export function filterVideosWithDisplayableThumbnail<T extends Video>(rows: T[]): T[] {
  return rows.filter(videoRowHasDisplayableThumbnail);
}
