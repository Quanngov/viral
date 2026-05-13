import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import type { Video } from "@prisma/client";
import { logAdminEvent, safeMeta } from "@/lib/admin-events";
import { compactTranscriptJsonForDb, groqTranscribeFromUrl } from "@/lib/groq-transcription";
import { prisma } from "@/lib/prisma";
import { srtOrVttToPlainText } from "@/lib/subtitle-parse";
import { getGroqWhisperModel, getTranscriptionTokenCost } from "@/lib/transcription-config";
import { creditTokens, ensureSessionUser, getTokenBalanceForUser, spendTokens } from "@/lib/token-wallet";
import { refreshInstagramVideoFromTikHubForTranscription } from "@/lib/instagram-transcribe-refresh";
import { resolveVideoForTranscription, type ResolveVideoForTranscriptionInput } from "@/lib/resolve-video-for-transcription";
import { listTranscriptionSubtitleUris, resolvePlayableVideoUrl, extractInstagramReelCodeFromVideo } from "@/lib/video-transcription-resolve";
import { videoClientId } from "@/lib/video-client-id";

export const dynamic = "force-dynamic";

const BUSY_MS = 15 * 60 * 1000;
const SUBTITLE_FETCH_MS = 28_000;
const GROQ_FETCH_MS = 120_000;

const YT_NO_AUDIO_MSG = "Для YouTube-ролика пока нет распознавания без субтитров.";

const INSTAGRAM_NO_VIDEO_MSG =
  "Не удалось получить видеофайл для этого ролика. Попробуйте найти ролик заново через поиск.";

function urlHost(u: string): string {
  try {
    return new URL(u).hostname;
  } catch {
    return "invalid_url";
  }
}

function clientIdForVideo(v: Video): string {
  return videoClientId(v.platform, v.externalId);
}

function extractSegmentsFromJson(json: Prisma.JsonValue | null): { start?: number; end?: number; text?: string }[] {
  if (json == null || typeof json !== "object" || Array.isArray(json)) return [];
  const o = json as Record<string, unknown>;
  const segs = o.segments;
  if (!Array.isArray(segs)) return [];
  return segs.slice(0, 80).map((s) => {
    if (!s || typeof s !== "object") return {};
    const r = s as Record<string, unknown>;
    return {
      start: typeof r.start === "number" ? r.start : undefined,
      end: typeof r.end === "number" ? r.end : undefined,
      text: typeof r.text === "string" ? r.text : undefined,
    };
  });
}

function shouldUseRussianLanguageHint(video: Video): boolean {
  const lang = video.language?.trim().toLowerCase() ?? "";
  return lang.startsWith("ru");
}

async function fetchSubtitlePlainText(uri: string): Promise<string | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), SUBTITLE_FETCH_MS);
  try {
    const res = await fetch(uri, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) return null;
    const raw = await res.text();
    const plain = srtOrVttToPlainText(raw);
    return plain.length > 0 ? plain : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function trySubtitlesFirst(video: Video): Promise<{ text: string; uriHost: string } | null> {
  const urls = listTranscriptionSubtitleUris(video);
  for (const uri of urls) {
    const text = await fetchSubtitlePlainText(uri);
    if (text?.trim()) {
      return { text: text.trim(), uriHost: urlHost(uri) };
    }
  }
  return null;
}

function parseTranscribeInputFromSearchParams(sp: URLSearchParams): ResolveVideoForTranscriptionInput {
  return {
    competitorVideoId: sp.get("competitorVideoId"),
    savedVideoId: sp.get("savedVideoId"),
    videoId: sp.get("videoId"),
    platform: sp.get("platform"),
    externalId: sp.get("externalId"),
  };
}

export async function GET(req: Request) {
  const { userId } = await ensureSessionUser();
  const sp = new URL(req.url).searchParams;
  const input = parseTranscribeInputFromSearchParams(sp);
  const hasAny =
    Boolean(input.competitorVideoId?.trim()) ||
    Boolean(input.savedVideoId?.trim()) ||
    Boolean(input.videoId?.trim()) ||
    (Boolean(input.platform?.trim()) && Boolean(input.externalId?.trim()));
  if (!hasAny) {
    return NextResponse.json(
      { error: "bad_request", message: "Укажите videoId, savedVideoId, competitorVideoId либо platform и externalId." },
      { status: 400 },
    );
  }
  const resolved = await resolveVideoForTranscription(input, userId);
  if (!resolved.ok) {
    return NextResponse.json({ error: "not_found", message: resolved.message }, { status: resolved.status });
  }
  const v = resolved.video;
  const segments = extractSegmentsFromJson(v.transcriptJson);
  const subtitleUris = listTranscriptionSubtitleUris(v);
  const playableUrl = resolvePlayableVideoUrl(v);
  let canTranscribe = subtitleUris.length > 0 || Boolean(playableUrl);
  if (!canTranscribe && v.platform === "instagram") {
    const code = extractInstagramReelCodeFromVideo(v);
    const igUrl = Boolean(v.url?.includes("instagram.com"));
    canTranscribe = Boolean(code) || igUrl;
  }
  return NextResponse.json({
    videoId: clientIdForVideo(v),
    platform: v.platform,
    transcriptStatus: v.transcriptStatus ?? null,
    transcriptText: v.transcriptText ?? null,
    transcriptSource: v.transcriptSource ?? null,
    transcriptLanguage: v.transcriptLanguage ?? null,
    transcriptCreatedAt: v.transcriptCreatedAt?.toISOString() ?? null,
    segments,
    canTranscribe,
  });
}

type PostBody = {
  videoId?: string;
  savedVideoId?: string;
  competitorVideoId?: string;
  platform?: string;
  externalId?: string;
  force?: boolean;
};

export async function POST(req: Request) {
  const { userId, sessionKey } = await ensureSessionUser();
  const cost = getTranscriptionTokenCost();
  const model = getGroqWhisperModel();
  const groqKey = process.env.GROQ_API_KEY?.trim() ?? "";

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const force = Boolean(body.force);
  const input: ResolveVideoForTranscriptionInput = {
    competitorVideoId: typeof body.competitorVideoId === "string" ? body.competitorVideoId : undefined,
    savedVideoId: typeof body.savedVideoId === "string" ? body.savedVideoId : undefined,
    videoId: typeof body.videoId === "string" ? body.videoId : undefined,
    platform: typeof body.platform === "string" ? body.platform : undefined,
    externalId: typeof body.externalId === "string" ? body.externalId : undefined,
  };

  const resolved = await resolveVideoForTranscription(input, userId);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.status === 400 ? "bad_request" : "not_found", message: resolved.message }, { status: resolved.status });
  }
  let v = resolved.video;

  const cid = clientIdForVideo(v);

  const hasReadyTranscript =
    Boolean(v.transcriptText?.trim()) && v.transcriptStatus !== "processing" && v.transcriptStatus !== "failed";
  if (hasReadyTranscript && !force) {
    await logAdminEvent({
      level: "info",
      type: "transcript_cache_hit",
      message: "Транскрипт из кэша",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({ videoId: cid, transcriptSource: v.transcriptSource }),
    });
    return NextResponse.json({
      videoId: cid,
      transcriptText: v.transcriptText,
      transcriptStatus: v.transcriptStatus ?? "ready",
      transcriptSource: v.transcriptSource,
      transcriptLanguage: v.transcriptLanguage,
      transcriptCreatedAt: v.transcriptCreatedAt?.toISOString() ?? null,
      segments: extractSegmentsFromJson(v.transcriptJson),
      cached: true,
      balance: await getTokenBalanceForUser(userId),
    });
  }

  if (v.transcriptStatus === "processing") {
    const age = Date.now() - v.updatedAt.getTime();
    if (age < BUSY_MS && !force) {
      return NextResponse.json(
        {
          error: "busy",
          message: "Транскрибация уже выполняется",
          transcriptStatus: "processing",
        },
        { status: 409 },
      );
    }
  }

  if (v.platform === "instagram") {
    const subsBefore = listTranscriptionSubtitleUris(v);
    const playBefore = resolvePlayableVideoUrl(v);
    if (subsBefore.length === 0 && !playBefore) {
      v = await refreshInstagramVideoFromTikHubForTranscription(v, {
        sessionId: sessionKey,
        userId,
        clientVideoId: cid,
      });
    }
  }

  const subtitleUris = listTranscriptionSubtitleUris(v);
  const playableUrl = resolvePlayableVideoUrl(v);
  const isYoutube = v.platform === "youtube";

  if (isYoutube && subtitleUris.length === 0 && !playableUrl) {
    await logAdminEvent({
      level: "info",
      type: "transcript_failed",
      message: "YouTube: нет субтитров и прямого аудио",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({ videoId: cid, reason: "youtube_no_direct_audio" }),
    });
    return NextResponse.json(
      {
        error: "unavailable",
        code: "youtube_no_audio",
        message: YT_NO_AUDIO_MSG,
      },
      { status: 422 },
    );
  }

  const canTrySubtitles = subtitleUris.length > 0;
  const canTryGroq = Boolean(playableUrl) && Boolean(groqKey);

  if (!canTrySubtitles && !canTryGroq) {
    const message = !groqKey
      ? "Транскрибация недоступна: не задан GROQ_API_KEY на сервере."
      : v.platform === "instagram"
        ? INSTAGRAM_NO_VIDEO_MSG
        : "Нет субтитров и прямого URL видео для распознавания. Попробуйте обновить ролик в ленте или выберите другой.";
    await logAdminEvent({
      level: "warn",
      type: "transcript_failed",
      message: "Нет источника для транскрибации",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({
        videoId: cid,
        reason: !groqKey ? "missing_groq_key" : "no_subtitles_and_no_video_url",
        hasPlayableUrl: Boolean(playableUrl),
        platform: v.platform,
      }),
    });
    return NextResponse.json(
      {
        error: "unavailable",
        message,
      },
      { status: 503 },
    );
  }

  const spend = await spendTokens(userId, cost, "video_transcription", { sessionId: sessionKey });
  if (!spend.ok) {
    await logAdminEvent({
      level: "warn",
      type: "transcript_failed",
      message: "Недостаточно токенов для транскрибации",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({ videoId: cid, cost, balance: spend.balance }),
    });
    return NextResponse.json(
      { error: "insufficient_tokens", message: "Недостаточно токенов.", balance: spend.balance },
      { status: 402 },
    );
  }

  await prisma.video.update({
    where: { id: v.id },
    data: { transcriptStatus: "processing", transcriptText: null },
  });

  await logAdminEvent({
    level: "info",
    type: "transcript_start",
    message: "Старт транскрибации",
    sessionId: sessionKey,
    userId,
    meta: safeMeta({
      videoId: cid,
      cost,
      willTrySubtitles: canTrySubtitles,
      willTryGroq: canTryGroq,
      videoUrlHost: playableUrl ? urlHost(playableUrl) : null,
    }),
  });

  const fail = async (msg: string, meta: Record<string, unknown>) => {
    await creditTokens(userId, cost, "video_transcription_refund", { sessionId: sessionKey });
    await prisma.video.update({
      where: { id: v.id },
      data: { transcriptStatus: "failed" },
    });
    await logAdminEvent({
      level: "warn",
      type: "transcript_failed",
      message: msg,
      sessionId: sessionKey,
      userId,
      meta: safeMeta({ videoId: cid, ...meta }),
    });
  };

  try {
    const sub = await trySubtitlesFirst(v);
    if (sub) {
      const json: Prisma.InputJsonValue = {
        text: sub.text.slice(0, 120_000),
        source: "subtitles",
        subtitleHost: sub.uriHost,
        segments: [],
      };
      await prisma.video.update({
        where: { id: v.id },
        data: {
          transcriptText: sub.text,
          transcriptJson: json,
          transcriptStatus: "ready",
          transcriptSource: "subtitles",
          transcriptLanguage: v.language?.trim() || null,
          transcriptCreatedAt: new Date(),
        },
      });
      await logAdminEvent({
        level: "info",
        type: "transcript_subtitles_success",
        message: "Транскрипт из субтитров",
        sessionId: sessionKey,
        userId,
        meta: safeMeta({
          videoId: cid,
          cost,
          chars: sub.text.length,
          subtitleHost: sub.uriHost,
        }),
      });
      const balance = await getTokenBalanceForUser(userId);
      return NextResponse.json({
        videoId: cid,
        transcriptText: sub.text,
        transcriptStatus: "ready",
        transcriptSource: "subtitles",
        transcriptLanguage: v.language?.trim() || null,
        transcriptCreatedAt: new Date().toISOString(),
        segments: [],
        balance,
      });
    }

    if (!playableUrl) {
      await fail("Нет URL видео после неудачи субтитров", { stage: "no_video_url" });
      return NextResponse.json({ error: "failed", message: "Не удалось получить текст из субтитров." }, { status: 502 });
    }
    if (!groqKey) {
      await fail("Нет GROQ_API_KEY", { stage: "missing_groq" });
      return NextResponse.json({ error: "failed", message: "Groq не настроен." }, { status: 503 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GROQ_FETCH_MS);
    let groqOut: Awaited<ReturnType<typeof groqTranscribeFromUrl>>;
    try {
      groqOut = await groqTranscribeFromUrl({
        apiKey: groqKey,
        model,
        audioUrl: playableUrl,
        language: shouldUseRussianLanguageHint(v) ? "ru" : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const text = groqOut.text.trim();
    if (!text) {
      await fail("Пустой ответ Groq", { stage: "groq_empty", videoUrlHost: urlHost(playableUrl) });
      return NextResponse.json({ error: "failed", message: "Распознавание не вернуло текст." }, { status: 502 });
    }

    const compact = compactTranscriptJsonForDb(groqOut);
    const json = compact as unknown as Prisma.InputJsonValue;

    await prisma.video.update({
      where: { id: v.id },
      data: {
        transcriptText: text,
        transcriptJson: json,
        transcriptStatus: "ready",
        transcriptSource: "groq_whisper",
        transcriptLanguage: groqOut.language ?? v.language?.trim() ?? null,
        transcriptCreatedAt: new Date(),
        videoUrl: v.videoUrl?.trim() ? v.videoUrl : playableUrl,
      },
    });

    await logAdminEvent({
      level: "info",
      type: "transcript_groq_success",
      message: "Транскрипт Groq Whisper",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({
        videoId: cid,
        cost,
        model,
        chars: text.length,
        segmentCount: groqOut.segments.length,
        videoUrlHost: urlHost(playableUrl),
      }),
    });

    const balance = await getTokenBalanceForUser(userId);
    return NextResponse.json({
      videoId: cid,
      transcriptText: text,
      transcriptStatus: "ready",
      transcriptSource: "groq_whisper",
      transcriptLanguage: groqOut.language ?? v.language?.trim() ?? null,
      transcriptCreatedAt: new Date().toISOString(),
      segments: groqOut.segments.slice(0, 80),
      balance,
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300);
    await fail("Ошибка транскрибации", { stage: "exception", err: errMsg });
    return NextResponse.json({ error: "failed", message: "Не удалось выполнить транскрибацию." }, { status: 502 });
  }
}
