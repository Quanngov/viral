import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureSessionUser } from "@/lib/token-wallet";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { userId } = await ensureSessionUser();
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") === "all" ? "all" : "latest";
  const limitRaw = Number(searchParams.get("limit") ?? (mode === "latest" ? "20" : "100"));
  const limit = Math.min(200, Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 20));
  const sortBy = searchParams.get("sortBy");
  const sortOrder: Prisma.SortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const orderBy: Prisma.CompetitorVideoOrderByWithRelationInput[] =
    mode === "latest"
      ? [{ publishedAt: "desc" }]
      : sortBy === "views" || sortBy === "likes" || sortBy === "comments" || sortBy === "score"
        ? [{ [sortBy]: sortOrder }]
        : sortBy === "account"
          ? [{ competitor: { displayName: sortOrder } }]
          : [{ publishedAt: "desc" }];

  const rows = await prisma.competitorVideo.findMany({
    where: { competitor: { userId } },
    include: {
      competitor: {
        select: {
          displayName: true,
          username: true,
          avatarUrl: true,
          platform: true,
          profileUrl: true,
        },
      },
    },
    orderBy,
    take: limit,
  });

  return NextResponse.json({ videos: rows });
}
