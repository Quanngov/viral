import "server-only";

import { formatViewsCount } from "@/lib/format-video";
import { prisma } from "@/lib/prisma";

export type LandingMarqueeVideo = {
  id: string;
  title: string;
  views: string;
};

export async function getLandingMarqueeVideos(limit = 30): Promise<LandingMarqueeVideo[]> {
  try {
    const videos = await prisma.video.findMany({
      where: {
        title: { not: "" },
        views: { gt: 1000 },
      },
      orderBy: [{ views: "desc" }, { publishedAt: "desc" }],
      take: limit,
      select: {
        id: true,
        title: true,
        views: true,
      },
    });

    return videos.map((video) => ({
      id: video.id,
      title: video.title.trim(),
      views: formatViewsCount(video.views),
    }));
  } catch {
    return [];
  }
}
