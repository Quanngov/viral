import { NextResponse } from "next/server";
import { detachScriptVideoReference } from "@/lib/script-chat-reference";
import { ensureSessionUser } from "@/lib/token-wallet";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ chatId: string; referenceId: string }> };

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { userId } = await ensureSessionUser();
  const { chatId, referenceId } = await ctx.params;

  const r = await detachScriptVideoReference(chatId, userId, referenceId);
  if (!r.ok) {
    return NextResponse.json({ error: "not_found", message: r.message }, { status: r.status });
  }

  return NextResponse.json({ ok: true });
}
