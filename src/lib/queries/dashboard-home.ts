import { prisma } from "@/lib/prisma";
import { HOME_VIDEO_WHERE, videoHomeCardSelect } from "@/lib/prisma-video-select";
import { filterAndResolveDisplayableVideos } from "@/lib/grid-video-display";
import { videoToHomeCardJson } from "@/lib/serialize-video";

/** Top popular shorts for the home grid — always returns `limit` displayable cards when DB has enough. */
export async function queryHomeVideoCards(limit: number, skip = 0) {
  const collected = [];
  let dbSkip = skip;
  const batchSize = Math.max(limit * 4, limit + 16);
  const maxScan = skip + Math.max(limit * 12, 96);

  while (collected.length < limit && dbSkip < maxScan) {
    const rows = await prisma.video.findMany({
      where: HOME_VIDEO_WHERE,
      orderBy: [{ score: "desc" }, { viralScore: "desc" }, { views: "desc" }],
      skip: dbSkip,
      take: batchSize,
      select: videoHomeCardSelect,
    });
    if (rows.length === 0) break;
    const batch = filterAndResolveDisplayableVideos(rows.map(videoToHomeCardJson));
    for (const card of batch) {
      collected.push(card);
      if (collected.length >= limit) break;
    }
    dbSkip += rows.length;
  }

  return collected.slice(0, limit);
}

/** Expensive — never call on initial dashboard paint; use lazy /count route only. */
export async function queryHomeVideoCount() {
  return prisma.video.count({ where: HOME_VIDEO_WHERE });
}
