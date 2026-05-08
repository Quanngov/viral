import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { adminForbiddenResponse, isAdminRequestAuthorized } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SORT_FIELDS = new Set<string>([
  "views",
  "likes",
  "comments",
  "publishedAt",
  "score",
  "viralScore",
  "viewsPerHour",
  "engagementRate",
  "createdAt",
  "updatedAt",
  "durationSeconds",
]);

function parseIntParam(raw: string | null, fallback: number, max?: number) {
  const n = Number.parseInt(raw ?? "", 10);
  if (Number.isNaN(n) || n < 1) return fallback;
  if (max !== undefined) return Math.min(n, max);
  return n;
}

export async function GET(req: Request) {
  if (!isAdminRequestAuthorized(req)) return adminForbiddenResponse();

  const url = new URL(req.url);
  const page = parseIntParam(url.searchParams.get("page"), 1);
  const limit = parseIntParam(url.searchParams.get("limit"), 50, 100);
  const allowedLimits = new Set([25, 50, 100]);
  const safeLimit = allowedLimits.has(limit) ? limit : 50;

  let sortBy = url.searchParams.get("sortBy") ?? "score";
  if (!SORT_FIELDS.has(sortBy)) sortBy = "score";

  const sortOrderRaw = url.searchParams.get("sortOrder") ?? "desc";
  const sortOrder: Prisma.SortOrder = sortOrderRaw === "asc" ? "asc" : "desc";

  const q = url.searchParams.get("q")?.trim() ?? "";
  const platform = url.searchParams.get("platform")?.trim() ?? "";
  const niche = url.searchParams.get("niche")?.trim() ?? "";
  const sourceQuery = url.searchParams.get("sourceQuery")?.trim() ?? "";

  const where: Prisma.VideoWhereInput = {};

  if (platform && platform !== "all") {
    where.platform = platform;
  }

  if (niche && niche !== "all") {
    where.niche = niche;
  }

  if (sourceQuery && sourceQuery !== "all") {
    where.sourceQuery = sourceQuery;
  }

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { channelTitle: { contains: q } },
      { sourceQuery: { contains: q } },
      { niche: { contains: q } },
      { url: { contains: q } },
    ];
  }

  const skip = (page - 1) * safeLimit;

  const orderBy = { [sortBy]: sortOrder } as Prisma.VideoOrderByWithRelationInput;

  const [totalCount, rows] = await Promise.all([
    prisma.video.count({ where }),
    prisma.video.findMany({
      where,
      orderBy,
      skip,
      take: safeLimit,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));

  const videos = rows.map((v) => ({
    id: v.id,
    platform: v.platform,
    youtubeVideoId: v.youtubeVideoId,
    url: v.url,
    title: v.title,
    description: v.description,
    channelId: v.channelId,
    channelTitle: v.channelTitle,
    thumbnailUrl: v.thumbnailUrl,
    views: v.views,
    likes: v.likes,
    comments: v.comments,
    durationSeconds: v.durationSeconds,
    publishedAt: v.publishedAt.toISOString(),
    ageHours: v.ageHours,
    score: v.score,
    viralScore: v.viralScore,
    viewsPerHour: v.viewsPerHour,
    engagementRate: v.engagementRate,
    sourceQuery: v.sourceQuery,
    niche: v.niche,
    language: v.language,
    region: v.region,
    relevanceScore: v.relevanceScore,
    rawScore: v.rawScore,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
    lastFetchedAt: v.lastFetchedAt?.toISOString() ?? null,
  }));

  return NextResponse.json({
    videos,
    totalCount,
    page,
    limit: safeLimit,
    totalPages,
  });
}
