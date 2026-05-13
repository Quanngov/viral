import { NextResponse } from "next/server";
import { compactErrorMeta, logAdminEvent, safeMeta } from "@/lib/admin-events";
import { prisma } from "@/lib/prisma";
import { ensureSessionUser } from "@/lib/token-wallet";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ competitorId: string }> };

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { competitorId } = await ctx.params;
  const id = competitorId?.trim();
  if (!id) {
    return NextResponse.json({ error: "bad_request", message: "Не указан конкурент" }, { status: 400 });
  }

  const { userId, sessionKey } = await ensureSessionUser();

  const existing = await prisma.competitorAccount.findFirst({
    where: { id, userId },
    select: { id: true, platform: true, username: true, displayName: true },
  });

  if (!existing) {
    await logAdminEvent({
      level: "error",
      type: "competitor_delete",
      message: "Удаление конкурента: не найден",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({ competitorId: id }),
    });
    return NextResponse.json({ error: "not_found", message: "Конкурент не найден" }, { status: 404 });
  }

  let deletedVideosCount = 0;
  try {
    deletedVideosCount = await prisma.competitorVideo.count({
      where: { competitorId: id },
    });

    await prisma.competitorAccount.deleteMany({ where: { id, userId } });

    await logAdminEvent({
      level: "info",
      type: "competitor_delete",
      message: "Конкурент удалён",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({
        competitorId: existing.id,
        platform: existing.platform,
        username: existing.username ?? existing.displayName ?? null,
        deletedVideosCount,
      }),
    });

    return NextResponse.json({ ok: true, deletedVideosCount });
  } catch (err) {
    await logAdminEvent({
      level: "error",
      type: "competitor_delete",
      message: "Ошибка при удалении конкурента",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({
        competitorId: existing.id,
        platform: existing.platform,
        username: existing.username ?? existing.displayName ?? null,
        deletedVideosCount,
        ...compactErrorMeta(err),
      }),
    });
    return NextResponse.json({ error: "server_error", message: "Не удалось удалить конкурента" }, { status: 500 });
  }
}
