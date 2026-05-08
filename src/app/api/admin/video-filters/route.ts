import { NextResponse } from "next/server";
import { adminForbiddenResponse, isAdminRequestAuthorized } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAdminRequestAuthorized(req)) return adminForbiddenResponse();

  const [platformRows, nicheRows, sqRows] = await Promise.all([
    prisma.video.groupBy({
      by: ["platform"],
      _count: { _all: true },
    }),
    prisma.video.findMany({
      where: { niche: { not: null } },
      select: { niche: true },
      distinct: ["niche"],
    }),
    prisma.video.findMany({
      where: { sourceQuery: { not: null } },
      select: { sourceQuery: true },
      distinct: ["sourceQuery"],
    }),
  ]);

  const platforms = platformRows.map((r) => r.platform).sort();
  const niches = nicheRows.map((r) => r.niche!).filter(Boolean).sort();
  const sourceQueries = sqRows.map((r) => r.sourceQuery!).filter(Boolean).sort();

  return NextResponse.json({
    platforms,
    niches,
    sourceQueries,
  });
}
