import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withApiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { ensureSessionUser } from "@/lib/token-wallet";
import { fillDisplayableFromPool } from "@/lib/grid-video-display";
import { hasResolvableThumbnail } from "@/lib/video-thumbnail";

export const dynamic = "force-dynamic";

export const GET = withApiRoute("competitors.videos.GET", async (req) => {
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

  const oversample = Math.min(500, Math.max(limit * 4, limit + 40));
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
    take: oversample,
  });

  const videos = fillDisplayableFromPool(rows, limit, (v) =>
    hasResolvableThumbnail(v.platform, v.externalId, v.thumbnailUrl),
  );

  return NextResponse.json({ videos });
});
