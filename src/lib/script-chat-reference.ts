import type { ScriptChatReference } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  resolveVideoForTranscription,
  type ResolveVideoForTranscriptionInput,
} from "@/lib/resolve-video-for-transcription";

export const SCRIPT_REF_LIMIT_MESSAGE =
  "В один чат можно добавить только один ролик-референс. Создайте новый чат для другого ролика.";

export const SCRIPT_REF_DUPLICATE_MESSAGE = "Этот ролик уже добавлен в чат";

export type AttachScriptReferenceResult =
  | { ok: true; duplicate: boolean; reference: ScriptChatReference }
  | { ok: false; status: 404 | 400 | 409; message: string; code?: "ref_limit" };

export async function attachScriptVideoReference(
  chatId: string,
  userId: string,
  input: ResolveVideoForTranscriptionInput,
): Promise<AttachScriptReferenceResult> {
  const chat = await prisma.scriptChat.findFirst({ where: { id: chatId, userId } });
  if (!chat) return { ok: false, status: 404, message: "Чат не найден." };

  const resolved = await resolveVideoForTranscription(input, userId);
  if (!resolved.ok) return { ok: false, status: resolved.status, message: resolved.message };

  const v = resolved.video;

  const existingAny = await prisma.scriptChatReference.findFirst({
    where: { chatId },
    orderBy: { createdAt: "asc" },
  });
  if (existingAny) {
    const same = existingAny.platform === v.platform && existingAny.externalId === v.externalId;
    if (same) {
      return { ok: true, duplicate: true, reference: existingAny };
    }
    return { ok: false, status: 409, code: "ref_limit", message: SCRIPT_REF_LIMIT_MESSAGE };
  }

  const savedId = input.savedVideoId?.trim() || null;
  const compId = input.competitorVideoId?.trim() || null;

  const reference = await prisma.scriptChatReference.create({
    data: {
      chatId,
      videoId: v.id,
      savedVideoId: savedId,
      competitorVideoId: compId,
      platform: v.platform,
      externalId: v.externalId,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      videoUrl: v.videoUrl,
      url: v.url,
      authorUsername: v.authorUsername,
      authorDisplayName: v.authorDisplayName ?? v.channelTitle,
      views: v.views,
      rating: v.rating,
      durationSeconds: v.durationSeconds,
      publishedAt: v.publishedAt,
      description: v.description ? v.description.slice(0, 4000) : null,
      transcriptSource: v.transcriptSource,
    },
  });

  await prisma.scriptChat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });

  return { ok: true, duplicate: false, reference };
}

export type ScriptChatReferenceApiRow = {
  id: string;
  platform: string;
  externalId: string;
  title: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  url: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
  views: number;
  rating: number;
  durationSeconds: number | null;
  hasTranscript: boolean;
  transcriptSource: string | null;
  transcriptText: string | null;
};

export function serializeScriptChatReference(
  ref: ScriptChatReference,
  video: { transcriptText: string | null; transcriptSource: string | null } | null,
): ScriptChatReferenceApiRow {
  const tt = video?.transcriptText ?? null;
  return {
    id: ref.id,
    platform: ref.platform,
    externalId: ref.externalId,
    title: ref.title,
    thumbnailUrl: ref.thumbnailUrl,
    videoUrl: ref.videoUrl,
    url: ref.url,
    authorUsername: ref.authorUsername,
    authorDisplayName: ref.authorDisplayName,
    views: ref.views,
    rating: ref.rating,
    durationSeconds: ref.durationSeconds,
    hasTranscript: Boolean(tt?.trim()),
    transcriptSource: video?.transcriptSource ?? ref.transcriptSource,
    transcriptText: tt,
  };
}
