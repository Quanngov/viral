import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { ensureSessionUser } from "@/lib/token-wallet";
import { getScriptGenerationTokenCost } from "@/lib/script-generator-config";

export const dynamic = "force-dynamic";

export const GET = withApiRoute("script-generator.chats.GET", async () => {
  const { userId } = await ensureSessionUser();
  const chats = await prisma.scriptChat.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true, createdAt: true },
  });
  return NextResponse.json({ chats, tokenCost: getScriptGenerationTokenCost() });
});

export async function POST(req: Request) {
  const { userId } = await ensureSessionUser();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const titleRaw = typeof o.title === "string" ? o.title.trim().slice(0, 120) : "";
  const title = titleRaw || "Новый чат";
  const chat = await prisma.scriptChat.create({
    data: { userId, title },
    select: { id: true, title: true, updatedAt: true, createdAt: true },
  });
  return NextResponse.json({ chat, tokenCost: getScriptGenerationTokenCost() });
}
