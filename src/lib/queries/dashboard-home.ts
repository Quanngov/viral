import { prisma } from "@/lib/prisma";
import { HOME_VIDEO_WHERE, videoHomeCardSelect } from "@/lib/prisma-video-select";
import { filterDisplayableVideos } from "@/lib/grid-video-display";
import { videoToHomeCardJson } from "@/lib/serialize-video";

export async function queryHomeVideoCards(limit: number, skip = 0) {
  const rows = await prisma.video.findMany({
    where: HOME_VIDEO_WHERE,
    orderBy: [{ score: "desc" }, { viralScore: "desc" }],
    skip,
    take: limit,
    select: videoHomeCardSelect,
  });
  return filterDisplayableVideos(rows.map(videoToHomeCardJson));
}

/** Expensive — never call on initial dashboard paint; use lazy /count route only. */
export async function queryHomeVideoCount() {
  return prisma.video.count({ where: HOME_VIDEO_WHERE });
}
