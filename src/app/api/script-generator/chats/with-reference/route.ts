import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSessionUser } from "@/lib/token-wallet";
import { getScriptGenerationTokenCost } from "@/lib/script-generator-config";
import type { ResolveVideoForTranscriptionInput } from "@/lib/resolve-video-for-transcription";
import { attachScriptVideoReference, serializeScriptChatReference } from "@/lib/script-chat-reference";

export const dynamic = "force-dynamic";

function parseBody(o: Record<string, unknown>): {
  title: string;
  input: ResolveVideoForTranscriptionInput;
} | null {
  const titleRaw = typeof o.title === "string" ? o.title.trim().slice(0, 120) : "";
  const title = titleRaw || "Новый чат";
  const input: ResolveVideoForTranscriptionInput = {
    competitorVideoId: typeof o.competitorVideoId === "string" ? o.competitorVideoId : undefined,
    savedVideoId: typeof o.savedVideoId === "string" ? o.savedVideoId : undefined,
    videoId: typeof o.videoId === "string" ? o.videoId : undefined,
    platform: typeof o.platform === "string" ? o.platform : undefined,
    externalId: typeof o.externalId === "string" ? o.externalId : undefined,
  };
  const has =
    Boolean(input.competitorVideoId?.trim()) ||
    Boolean(input.savedVideoId?.trim()) ||
    Boolean(input.videoId?.trim()) ||
    (Boolean(input.platform?.trim()) && Boolean(input.externalId?.trim()));
  if (!has) return null;
  return { title, input };
}

export async function POST(req: Request) {
  const { userId } = await ensureSessionUser();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const parsed = parseBody(o);
  if (!parsed) {
    return NextResponse.json(
      { error: "bad_request", message: "Нужны title и идентификатор ролика (videoId, savedVideoId или competitorVideoId)." },
      { status: 400 },
    );
  }

  const chat = await prisma.scriptChat.create({
    data: { userId, title: parsed.title },
    select: { id: true, title: true, updatedAt: true, createdAt: true },
  });

  const r = await attachScriptVideoReference(chat.id, userId, parsed.input);
  if (!r.ok) {
    await prisma.scriptChat.delete({ where: { id: chat.id } });
    return NextResponse.json(
      {
        error: r.code === "ref_limit" ? "ref_limit" : "not_found",
        code: r.code,
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
    chat,
    reference: serializeScriptChatReference(ref, video),
    duplicate: r.duplicate,
    tokenCost: getScriptGenerationTokenCost(),
  });
}
