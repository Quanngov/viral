import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSessionUser } from "@/lib/token-wallet";
import { getScriptGenerationTokenCost } from "@/lib/script-generator-config";
import type { ResolveVideoForTranscriptionInput } from "@/lib/resolve-video-for-transcription";
import { attachScriptVideoReference, serializeScriptChatReference } from "@/lib/script-chat-reference";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ chatId: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const { userId } = await ensureSessionUser();
  const { chatId } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
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
  if (!has) {
    return NextResponse.json(
      { error: "bad_request", message: "Передайте videoId, savedVideoId, competitorVideoId либо platform+externalId." },
      { status: 400 },
    );
  }

  const r = await attachScriptVideoReference(chatId, userId, input);
  if (!r.ok) {
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
    reference: serializeScriptChatReference(ref, video),
    duplicate: r.duplicate,
    tokenCost: getScriptGenerationTokenCost(),
  });
}
