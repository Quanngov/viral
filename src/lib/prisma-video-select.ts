import type { Prisma } from "@prisma/client";

export const HOME_VIDEO_WHERE: Prisma.VideoWhereInput = {
  durationSeconds: { lte: 60 },
  views: { gte: 500 },
  NOT: { thumbnailStatus: "invalid" },
  OR: [
    { platform: "youtube" },
    {
      AND: [{ thumbnailUrl: { not: null } }, { NOT: { thumbnailUrl: "" } }],
    },
  ],
};

/** Home grid — no transcript / blobs / heavy metrics. */
export const videoHomeCardSelect = {
  id: true,
  platform: true,
  externalId: true,
  title: true,
  thumbnailUrl: true,
  publishedAt: true,
  views: true,
  likes: true,
  rating: true,
  score: true,
  viralScore: true,
  url: true,
  videoUrl: true,
  channelTitle: true,
  authorDisplayName: true,
  authorUsername: true,
} satisfies Prisma.VideoSelect;

/** Realtime trends sidebar — minimal video fields. */
export const videoTrendPreviewSelect = {
  id: true,
  platform: true,
  externalId: true,
  title: true,
  thumbnailUrl: true,
  views: true,
} satisfies Prisma.VideoSelect;

export type VideoHomeCardRow = Prisma.VideoGetPayload<{ select: typeof videoHomeCardSelect }>;
export type VideoTrendPreviewRow = Prisma.VideoGetPayload<{ select: typeof videoTrendPreviewSelect }>;
