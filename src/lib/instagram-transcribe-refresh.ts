import type { Video } from "@prisma/client";
import { logAdminEvent, safeMeta } from "@/lib/admin-events";
import { fetchInstagramReelByCodeFromTikHub } from "@/lib/providers/tikhubInstagram";
import { prisma } from "@/lib/prisma";
import { extractInstagramReelCodeFromVideo } from "@/lib/video-transcription-resolve";

type RefreshCtx = {
  sessionId: string | null;
  userId: string | null;
  clientVideoId?: string;
};

/**
 * Перед транскрибацией подтягивает медиа/субтитры из TikHub и обновляет строку Video.
 * Не логирует полные URL и сырой JSON ответа.
 */
export async function refreshInstagramVideoFromTikHubForTranscription(
  video: Video,
  ctx?: RefreshCtx,
): Promise<Video> {
  if (video.platform !== "instagram") return video;

  const code = extractInstagramReelCodeFromVideo(video);
  const igUrl = video.url?.includes("instagram.com") ? video.url.trim() : null;
  if (!code && !igUrl) {
    await logAdminEvent({
      level: "info",
      type: "api_fetch",
      message: "TikHub: обновление IG перед транскрибацией пропущено",
      sessionId: ctx?.sessionId ?? null,
      userId: ctx?.userId ?? null,
      meta: safeMeta({
        kind: "instagram_transcribe_refresh_skip",
        videoId: ctx?.clientVideoId,
        reason: "no_code_or_ig_url",
      }),
    });
    return video;
  }

  const reel = await fetchInstagramReelByCodeFromTikHub(code || null, igUrl);
  if (!reel) {
    await logAdminEvent({
      level: "info",
      type: "api_fetch",
      message: "TikHub: обновление IG перед транскрибацией — не удалось",
      sessionId: ctx?.sessionId ?? null,
      userId: ctx?.userId ?? null,
      meta: safeMeta({
        kind: "instagram_transcribe_refresh",
        videoId: ctx?.clientVideoId,
        ok: false,
        hadCode: Boolean(code),
        hasIgUrl: Boolean(igUrl),
      }),
    });
    return video;
  }

  await prisma.video.update({
    where: { id: video.id },
    data: {
      lastFetchedAt: new Date(),
      ...(reel.videoUrl ? { videoUrl: reel.videoUrl } : {}),
      ...(reel.subtitlesUrl ? { subtitlesUrl: reel.subtitlesUrl } : {}),
      ...(reel.usefulRaw ? { usefulRaw: reel.usefulRaw } : {}),
      ...(reel.thumbnailUrl ? { thumbnailUrl: reel.thumbnailUrl } : {}),
      durationSeconds: reel.durationSeconds,
      views: reel.views,
      likes: reel.likes,
      comments: reel.comments,
      shares: reel.shares,
      ...(reel.language ? { language: reel.language } : {}),
      ...(reel.authorUsername ? { authorUsername: reel.authorUsername } : {}),
      ...(reel.authorDisplayName ? { authorDisplayName: reel.authorDisplayName } : {}),
      ...(reel.authorAvatarUrl ? { authorAvatarUrl: reel.authorAvatarUrl } : {}),
      ...(reel.followerCount != null ? { followerCount: reel.followerCount } : {}),
      ...(reel.description !== undefined ? { description: reel.description } : {}),
      title: reel.title,
      url: reel.url,
    },
  });

  await logAdminEvent({
    level: "info",
    type: "api_fetch",
    message: "TikHub: обновление IG перед транскрибацией — успех",
    sessionId: ctx?.sessionId ?? null,
    userId: ctx?.userId ?? null,
    meta: safeMeta({
      kind: "instagram_transcribe_refresh",
      videoId: ctx?.clientVideoId,
      ok: true,
      hadCode: Boolean(code),
    }),
  });

  const next = await prisma.video.findUnique({ where: { id: video.id } });
  return next ?? video;
}
