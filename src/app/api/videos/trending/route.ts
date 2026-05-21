import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { videoToTrendingJson } from "@/lib/serialize-video";

export const dynamic = "force-dynamic";

export const GET = withApiRoute("videos.trending.GET", async (req) => {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 10));

  const rows = await prisma.video.findMany({
    where: {
      durationSeconds: { lte: 60 },
      views: { gte: 500 },
    },
    orderBy: [{ score: "desc" }, { viewsPerHour: "desc" }],
    take: limit,
  });

  return NextResponse.json({
    videos: rows.map(videoToTrendingJson),
  });
});
