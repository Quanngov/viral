import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { videoToClientJson } from "@/lib/serialize-video";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 8));

  const [totalCount, rows] = await Promise.all([
    prisma.video.count(),
    prisma.video.findMany({
      where: {
        durationSeconds: { lte: 60 },
        views: { gte: 500 },
      },
      orderBy: [{ score: "desc" }, { viralScore: "desc" }],
      take: limit,
    }),
  ]);

  return NextResponse.json({
    videos: rows.map(videoToClientJson),
    totalCount,
  });
}
