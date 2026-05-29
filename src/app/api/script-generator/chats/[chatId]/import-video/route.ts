import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSessionUser } from "@/lib/token-wallet";
import { getScriptGenerationTokenCost } from "@/lib/script-generator-config";
import { attachScriptVideoReference, serializeScriptChatReference } from "@/lib/script-chat-reference";

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

  const r = await attachScriptVideoReference(chatId, userId, { savedVideoId });
  if (!r.ok) {
    const code = r.code ?? "not_found";
    return NextResponse.json(
      {
        error: code,
        code,
        message: r.message,
      },
      { status: r.status },
    );
  }

  const ref = r.reference;
  const video = ref.videoId
    ? await prisma.video.findUnique({
        where: { id: ref.videoId },
        select: { transcriptText: true, transcriptSource: true },
      })
    : null;

  return NextResponse.json({
    reference: serializeScriptChatReference(ref, video),
    duplicate: r.duplicate,
    replaced: r.replaced,
    tokenCost: getScriptGenerationTokenCost(),
  });
}
