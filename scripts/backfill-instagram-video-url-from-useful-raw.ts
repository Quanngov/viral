/**
 * Заполняет Video.videoUrl для Instagram из usefulRaw (video_url / video_versions),
 * если колонка пустая.
 * Запуск: npx tsx --tsconfig tsconfig.json scripts/backfill-instagram-video-url-from-useful-raw.ts
 */
import type { Video } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolvePlayableVideoUrl } from "@/lib/video-transcription-resolve";

async function main() {
  const rows = await prisma.video.findMany({
    where: { platform: "instagram" },
    select: { id: true, videoUrl: true, usefulRaw: true },
  });
  let updated = 0;
  for (const r of rows) {
    if (r.videoUrl?.trim()) continue;
    const resolved = resolvePlayableVideoUrl(r as Video);
    if (!resolved) continue;
    await prisma.video.update({
      where: { id: r.id },
      data: { videoUrl: resolved },
    });
    updated++;
  }
  console.log(`Instagram rows checked: ${rows.length}, videoUrl filled: ${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
