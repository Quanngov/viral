import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") === "all" ? "all" : "latest";
  const limitRaw = Number(searchParams.get("limit") ?? (mode === "latest" ? "20" : "100"));
  const limit = Math.min(200, Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 20));
  const sortBy = searchParams.get("sortBy");
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const orderBy =
    mode === "latest"
      ? [{ publishedAt: "desc" as const }]
      : sortBy === "views" || sortBy === "likes" || sortBy === "comments" || sortBy === "score"
        ? [{ [sortBy]: sortOrder }]
        : sortBy === "account"
          ? [{ competitor: { displayName: sortOrder } }]
          : [{ publishedAt: "desc" as const }];

  const rows = await prisma.competitorVideo.findMany({
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
