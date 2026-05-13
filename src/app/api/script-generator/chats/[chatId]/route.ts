import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSessionUser } from "@/lib/token-wallet";
import { getScriptGenerationTokenCost } from "@/lib/script-generator-config";
import { serializeScriptChatReference } from "@/lib/script-chat-reference";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ chatId: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { userId } = await ensureSessionUser();
  const { chatId } = await ctx.params;
  const chat = await prisma.scriptChat.findFirst({
    where: { id: chatId, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      references: {
        orderBy: { createdAt: "asc" },
        include: {
          video: {
            select: {
              transcriptText: true,
              transcriptSource: true,
            },
          },
        },
      },
    },
  });
  if (!chat) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    chat: { id: chat.id, title: chat.title, updatedAt: chat.updatedAt, createdAt: chat.createdAt },
    messages: chat.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      savedVideoId: m.savedVideoId,
      createdAt: m.createdAt,
    })),
    references: chat.references
      .slice(0, 1)
      .map((r) => serializeScriptChatReference(r, r.video)),
    tokenCost: getScriptGenerationTokenCost(),
  });
}
