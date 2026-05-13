import type { CompetitorVideo, SavedVideo, Video } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseVideoClientId } from "@/lib/video-client-id";

export type ResolveVideoForTranscriptionInput = {
  videoId?: string | null;
  savedVideoId?: string | null;
  competitorVideoId?: string | null;
  platform?: string | null;
  externalId?: string | null;
};

export type ResolveVideoForTranscriptionResult =
  | { ok: true; video: Video }
  | { ok: false; status: 400 | 404; message: string };

function usefulRawFromSavedRow(sv: SavedVideo): string | null {
  const vu = sv.videoUrl?.trim();
  if (!vu) return null;
  return JSON.stringify({
    code: sv.externalId,
    video_url: vu,
  });
}

function savedVideoToVideoCreate(sv: SavedVideo): Prisma.VideoUncheckedCreateInput {
  const publishedAt = sv.publishedAt ?? new Date();
  const ur = usefulRawFromSavedRow(sv);
  return {
    platform: sv.platform,
    externalId: sv.externalId,
    url: sv.url,
    title: sv.title,
    description: sv.description,
    thumbnailUrl: sv.thumbnailUrl,
    videoUrl: sv.videoUrl?.trim() || null,
    usefulRaw: ur,
    subtitlesUrl: null,
    publishedAt,
    durationSeconds: Math.max(0, sv.durationSeconds ?? 0),
    views: sv.views ?? 0,
    likes: sv.likes ?? 0,
    comments: sv.comments ?? 0,
    shares: sv.shares ?? 0,
    authorUsername: sv.authorUsername,
    authorDisplayName: sv.authorDisplayName ?? sv.authorUsername,
    authorAvatarUrl: sv.authorAvatarUrl,
    language: null,
    region: null,
    sourceQuery: "saved_transcribe",
    niche: null,
    ageHours: 0,
    relevanceScore: 0,
    rawScore: 0,
    score: Math.max(1, Math.min(99, sv.rating ?? 1)),
    rating: sv.rating ?? 0,
    viralScore: 0,
    viewsPerHour: 0,
    engagementRate: 0,
    channelId: null,
    channelTitle: null,
    followerCount: null,
    retentionRate: null,
    cacheUrl: null,
    lastFetchedAt: new Date(),
  };
}

function savedVideoToVideoUpdate(sv: SavedVideo): Prisma.VideoUncheckedUpdateInput {
  const ur = usefulRawFromSavedRow(sv);
  return {
    title: sv.title,
    url: sv.url,
    description: sv.description,
    thumbnailUrl: sv.thumbnailUrl,
    ...(sv.videoUrl?.trim() ? { videoUrl: sv.videoUrl.trim() } : {}),
    ...(ur ? { usefulRaw: ur } : {}),
    ...(sv.publishedAt ? { publishedAt: sv.publishedAt } : {}),
    ...(sv.durationSeconds != null ? { durationSeconds: Math.max(0, sv.durationSeconds) } : {}),
    ...(sv.views != null ? { views: sv.views } : {}),
    ...(sv.likes != null ? { likes: sv.likes } : {}),
    ...(sv.comments != null ? { comments: sv.comments } : {}),
    ...(sv.shares != null ? { shares: sv.shares } : {}),
    ...(sv.authorUsername ? { authorUsername: sv.authorUsername } : {}),
    ...(sv.authorDisplayName ? { authorDisplayName: sv.authorDisplayName } : {}),
    ...(sv.authorAvatarUrl ? { authorAvatarUrl: sv.authorAvatarUrl } : {}),
    ...(sv.rating != null ? { rating: sv.rating, score: Math.max(1, Math.min(99, sv.rating)) } : {}),
    lastFetchedAt: new Date(),
  };
}

async function upsertVideoFromSavedRow(sv: SavedVideo): Promise<ResolveVideoForTranscriptionResult> {
  await prisma.video.upsert({
    where: { platform_externalId: { platform: sv.platform, externalId: sv.externalId } },
    create: savedVideoToVideoCreate(sv),
    update: savedVideoToVideoUpdate(sv),
  });
  const video = await prisma.video.findUnique({
    where: { platform_externalId: { platform: sv.platform, externalId: sv.externalId } },
  });
  if (!video) return { ok: false, status: 404, message: "Ролик не найден." };
  return { ok: true, video };
}

function competitorVideoToVideoCreate(cv: CompetitorVideo): Prisma.VideoUncheckedCreateInput {
  return {
    platform: cv.platform,
    externalId: cv.externalId,
    url: cv.url,
    title: cv.title,
    description: cv.description,
    thumbnailUrl: cv.thumbnailUrl,
    videoUrl: cv.videoUrl?.trim() || null,
    subtitlesUrl: cv.subtitlesUrl?.trim() || null,
    usefulRaw: cv.usefulRaw ?? null,
    publishedAt: cv.publishedAt,
    durationSeconds: Math.max(0, cv.durationSeconds),
    views: cv.views,
    likes: cv.likes,
    comments: cv.comments,
    shares: cv.shares,
    authorUsername: cv.authorUsername,
    authorDisplayName: cv.authorDisplayName,
    authorAvatarUrl: cv.authorAvatarUrl,
    language: null,
    region: null,
    sourceQuery: "competitor_spy",
    niche: null,
    ageHours: 0,
    relevanceScore: 0,
    rawScore: 0,
    score: Math.max(1, Math.min(99, cv.score)),
    rating: 0,
    viralScore: cv.viralScore,
    viewsPerHour: cv.viewsPerHour,
    engagementRate: cv.engagementRate,
    channelId: null,
    channelTitle: null,
    followerCount: null,
    retentionRate: null,
    cacheUrl: null,
    lastFetchedAt: new Date(),
  };
}

function competitorVideoToVideoUpdate(cv: CompetitorVideo): Prisma.VideoUncheckedUpdateInput {
  return {
    title: cv.title,
    url: cv.url,
    description: cv.description,
    thumbnailUrl: cv.thumbnailUrl,
    ...(cv.videoUrl?.trim() ? { videoUrl: cv.videoUrl.trim() } : {}),
    ...(cv.subtitlesUrl?.trim() ? { subtitlesUrl: cv.subtitlesUrl.trim() } : {}),
    ...(cv.usefulRaw ? { usefulRaw: cv.usefulRaw } : {}),
    publishedAt: cv.publishedAt,
    durationSeconds: cv.durationSeconds,
    views: cv.views,
    likes: cv.likes,
    comments: cv.comments,
    shares: cv.shares,
    ...(cv.authorUsername ? { authorUsername: cv.authorUsername } : {}),
    ...(cv.authorDisplayName ? { authorDisplayName: cv.authorDisplayName } : {}),
    ...(cv.authorAvatarUrl ? { authorAvatarUrl: cv.authorAvatarUrl } : {}),
    score: Math.max(1, Math.min(99, cv.score)),
    viralScore: cv.viralScore,
    viewsPerHour: cv.viewsPerHour,
    engagementRate: cv.engagementRate,
    lastFetchedAt: new Date(),
  };
}

async function upsertVideoFromCompetitorRow(cv: CompetitorVideo): Promise<ResolveVideoForTranscriptionResult> {
  await prisma.video.upsert({
    where: { platform_externalId: { platform: cv.platform, externalId: cv.externalId } },
    create: competitorVideoToVideoCreate(cv),
    update: competitorVideoToVideoUpdate(cv),
  });
  const video = await prisma.video.findUnique({
    where: { platform_externalId: { platform: cv.platform, externalId: cv.externalId } },
  });
  if (!video) return { ok: false, status: 404, message: "Ролик не найден." };
  return { ok: true, video };
}

async function findVideoByVideoIdParam(videoId: string): Promise<Video | null> {
  const t = videoId.trim();
  if (!t) return null;
  const parsed = parseVideoClientId(t);
  if (parsed) {
    return prisma.video.findUnique({
      where: { platform_externalId: { platform: parsed.platform, externalId: parsed.externalId } },
    });
  }
  return prisma.video.findUnique({ where: { id: t } });
}

/**
 * Находит или создаёт строку `Video` для транскрибации из разных источников UI.
 * Приоритет идентификаторов: competitorVideoId → savedVideoId → videoId → platform+externalId.
 */
export async function resolveVideoForTranscription(
  input: ResolveVideoForTranscriptionInput,
  userId: string,
): Promise<ResolveVideoForTranscriptionResult> {
  const competitorVideoId = input.competitorVideoId?.trim() || null;
  const savedVideoId = input.savedVideoId?.trim() || null;
  const videoId = input.videoId?.trim() || null;
  const platform = input.platform?.trim() || null;
  const externalId = input.externalId?.trim() || null;

  if (competitorVideoId) {
    const cv = await prisma.competitorVideo.findFirst({
      where: { id: competitorVideoId, competitor: { userId } },
    });
    if (!cv) return { ok: false, status: 404, message: "Ролик не найден." };
    return upsertVideoFromCompetitorRow(cv);
  }

  if (savedVideoId) {
    const sv = await prisma.savedVideo.findFirst({
      where: { id: savedVideoId, userId },
    });
    if (!sv) return { ok: false, status: 404, message: "Ролик не найден." };
    return upsertVideoFromSavedRow(sv);
  }

  if (videoId) {
    const v = await findVideoByVideoIdParam(videoId);
    if (!v) return { ok: false, status: 404, message: "Ролик не найден." };
    return { ok: true, video: v };
  }

  if (platform && externalId) {
    const v = await prisma.video.findUnique({
      where: { platform_externalId: { platform, externalId } },
    });
    if (!v) return { ok: false, status: 404, message: "Ролик не найден." };
    return { ok: true, video: v };
  }

  return {
    ok: false,
    status: 400,
    message: "Укажите ролик: videoId, savedVideoId, competitorVideoId либо platform и externalId.",
  };
}
