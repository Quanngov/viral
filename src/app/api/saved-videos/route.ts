import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { logAdminEvent, safeMeta } from "@/lib/admin-events";
import { prisma } from "@/lib/prisma";
import { ensureSessionUser } from "@/lib/token-wallet";
import type { SaveVideoPayload } from "@/lib/saved-video-mapper";

export const dynamic = "force-dynamic";

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  return null;
}

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  return null;
}

function parsePayload(body: unknown): SaveVideoPayload | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const platform = strOrNull(o.platform)?.trim();
  const externalId = strOrNull(o.externalId)?.trim();
  const title = strOrNull(o.title)?.trim();
  const url = strOrNull(o.url)?.trim();
  if (!platform || !externalId || !title || !url || !url.startsWith("http")) return null;
  const st = strOrNull(o.sourceType)?.trim();
  const sourceType: SaveVideoPayload["sourceType"] =
    st === "feed" || st === "competitor" || st === "unknown" ? st : "unknown";

  let publishedAt: Date | null = null;
  const pRaw = o.publishedAt;
  if (typeof pRaw === "string" && pRaw.trim()) {
    const d = new Date(pRaw);
    if (!Number.isNaN(d.getTime())) publishedAt = d;
  }

  return {
    platform,
    externalId,
    title: title.slice(0, 500),
    description: strOrNull(o.description),
    url: url.slice(0, 2000),
    videoUrl: strOrNull(o.videoUrl),
    thumbnailUrl: strOrNull(o.thumbnailUrl),
    authorUsername: strOrNull(o.authorUsername),
    authorDisplayName: strOrNull(o.authorDisplayName),
    authorAvatarUrl: strOrNull(o.authorAvatarUrl),
    views: numOrNull(o.views),
    likes: numOrNull(o.likes),
    comments: numOrNull(o.comments),
    shares: numOrNull(o.shares),
    rating: numOrNull(o.rating),
    publishedAt: publishedAt?.toISOString() ?? null,
    durationSeconds: numOrNull(o.durationSeconds),
    sourceType: sourceType as SaveVideoPayload["sourceType"],
    sourceId: strOrNull(o.sourceId),
  };
}

export async function GET(req: Request) {
  const { userId, sessionKey } = await ensureSessionUser();
  const url = new URL(req.url);
  const logOpen = url.searchParams.get("log") === "1";

  const rows = await prisma.savedVideo.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (logOpen) {
    await logAdminEvent({
      level: "info",
      type: "saved_videos_open",
      message: "Открыт экран сохранённых",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({ count: rows.length }),
    });
  }

  return NextResponse.json({ videos: rows });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const payload = parsePayload(body);
  if (!payload) {
    return NextResponse.json({ error: "bad_request", message: "Нужны platform, externalId, title, url" }, { status: 400 });
  }

  const { userId, sessionKey } = await ensureSessionUser();

  const createData: Prisma.SavedVideoUncheckedCreateInput = {
    userId,
    platform: payload.platform,
    externalId: payload.externalId,
    title: payload.title,
    description: payload.description ?? null,
    url: payload.url,
    videoUrl: payload.videoUrl ?? null,
    thumbnailUrl: payload.thumbnailUrl ?? null,
    authorUsername: payload.authorUsername ?? null,
    authorDisplayName: payload.authorDisplayName ?? null,
    authorAvatarUrl: payload.authorAvatarUrl ?? null,
    views: payload.views ?? null,
    likes: payload.likes ?? null,
    comments: payload.comments ?? null,
    shares: payload.shares ?? null,
    rating: payload.rating ?? null,
    publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : null,
    durationSeconds: payload.durationSeconds ?? null,
    sourceType: payload.sourceType ?? "unknown",
    sourceId: payload.sourceId ?? null,
  };

  await prisma.savedVideo.upsert({
    where: {
      userId_platform_externalId: {
        userId,
        platform: payload.platform,
        externalId: payload.externalId,
      },
    },
    create: createData,
    update: {
      title: createData.title,
      description: createData.description,
      url: createData.url,
      videoUrl: createData.videoUrl,
      thumbnailUrl: createData.thumbnailUrl,
      authorUsername: createData.authorUsername,
      authorDisplayName: createData.authorDisplayName,
      authorAvatarUrl: createData.authorAvatarUrl,
      views: createData.views,
      likes: createData.likes,
      comments: createData.comments,
      shares: createData.shares,
      rating: createData.rating,
      publishedAt: createData.publishedAt,
      durationSeconds: createData.durationSeconds,
      sourceType: createData.sourceType,
      sourceId: createData.sourceId,
    },
  });

  await logAdminEvent({
    level: "info",
    type: "saved_video_add",
    message: "Сохранён ролик",
    sessionId: sessionKey,
    userId,
    meta: safeMeta({
      platform: payload.platform,
      externalId: payload.externalId,
      title: payload.title.slice(0, 120),
    }),
  });

  return NextResponse.json({ ok: true, saved: true });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const savedVideoId = url.searchParams.get("savedVideoId")?.trim();
  const platform = url.searchParams.get("platform")?.trim();
  const externalId = url.searchParams.get("externalId")?.trim();

  const { userId, sessionKey } = await ensureSessionUser();

  if (savedVideoId) {
    const row = await prisma.savedVideo.findFirst({
      where: { id: savedVideoId, userId },
    });
    if (!row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await prisma.savedVideo.delete({ where: { id: savedVideoId } });
    await logAdminEvent({
      level: "info",
      type: "saved_video_remove",
      message: "Удалён сохранённый ролик",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({
        platform: row.platform,
        externalId: row.externalId,
        title: row.title.slice(0, 120),
      }),
    });
    return NextResponse.json({ ok: true, saved: false });
  }

  if (platform && externalId) {
    const row = await prisma.savedVideo.findUnique({
      where: {
        userId_platform_externalId: { userId, platform, externalId },
      },
    });
    if (!row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await prisma.savedVideo.delete({
      where: { userId_platform_externalId: { userId, platform, externalId } },
    });
    await logAdminEvent({
      level: "info",
      type: "saved_video_remove",
      message: "Удалён сохранённый ролик",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({
        platform,
        externalId,
        title: row.title.slice(0, 120),
      }),
    });
    return NextResponse.json({ ok: true, saved: false });
  }

  return NextResponse.json({ error: "bad_request", message: "Нужен savedVideoId или platform+externalId" }, { status: 400 });
}
