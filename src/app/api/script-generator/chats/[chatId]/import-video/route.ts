import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSessionUser } from "@/lib/token-wallet";
import { compactSavedVideoForContext } from "@/lib/script-import-compact";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ chatId: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const { userId } = await ensureSessionUser();
  const { chatId } = await ctx.params;

  const chat = await prisma.scriptChat.findFirst({
    where: { id: chatId, userId },
    select: { id: true },
  });
  if (!chat) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;
  const sid = raw.savedVideoId;
  const savedVideoId = typeof sid === "string" ? sid.trim() : "";
  if (!savedVideoId) {
    return NextResponse.json({ error: "bad_request", message: "Нужен savedVideoId" }, { status: 400 });
  }

  const video = await prisma.savedVideo.findFirst({
    where: { id: savedVideoId, userId },
  });
  if (!video) {
    return NextResponse.json({ error: "not_found", message: "Ролик не найден" }, { status: 404 });
  }

  const content = compactSavedVideoForContext(video);
  const msg = await prisma.scriptMessage.create({
    data: {
      chatId,
      role: "system",
      content,
      savedVideoId: video.id,
    },
  });
  await prisma.scriptChat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({
    message: {
      id: msg.id,
      role: msg.role,
      content: msg.content,
      savedVideoId: msg.savedVideoId,
      createdAt: msg.createdAt,
    },
  });
}
