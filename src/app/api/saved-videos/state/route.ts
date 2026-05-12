import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSessionUser } from "@/lib/token-wallet";

export const dynamic = "force-dynamic";

const MAX_IDS = 400;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("ids")?.trim();
  if (!raw) {
    return NextResponse.json({ saved: {} as Record<string, boolean> });
  }

  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS);

  if (ids.length === 0) {
    return NextResponse.json({ saved: {} });
  }

  const { userId } = await ensureSessionUser();

  const parsed = ids
    .map((id) => {
      const i = id.indexOf(":");
      if (i <= 0) return null;
      return { platform: id.slice(0, i), externalId: id.slice(i + 1) };
    })
    .filter((x): x is { platform: string; externalId: string } => Boolean(x?.platform && x.externalId));

  if (parsed.length === 0) {
    return NextResponse.json({ saved: {} });
  }

  const rows = await prisma.savedVideo.findMany({
    where: {
      userId,
      OR: parsed.map((p) => ({ platform: p.platform, externalId: p.externalId })),
    },
    select: { platform: true, externalId: true },
  });

  const saved: Record<string, boolean> = {};
  for (const r of rows) {
    saved[`${r.platform}:${r.externalId}`] = true;
  }

  return NextResponse.json({ saved });
}
