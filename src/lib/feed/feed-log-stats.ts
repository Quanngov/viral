import type { Video } from "@prisma/client";

const MS_DAY = 86400000;

export function ageDaysVideo(v: Video, now: Date): number {
  return (now.getTime() - v.publishedAt.getTime()) / MS_DAY;
}

export function computeFeedVideoStats(videos: Video[], now: Date) {
  let youtube = 0;
  let instagram = 0;
  let ageLe7 = 0;
  let age8to30 = 0;
  let ageOlder = 0;
  for (const v of videos) {
    if (v.platform === "youtube") youtube += 1;
    else instagram += 1;
    const d = ageDaysVideo(v, now);
    if (d <= 7) ageLe7 += 1;
    else if (d <= 30) age8to30 += 1;
    else ageOlder += 1;
  }
  return { youtube, instagram, ageLe7, age8to30, ageOlder };
}
