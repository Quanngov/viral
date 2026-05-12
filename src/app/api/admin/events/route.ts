import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { adminForbiddenResponse, isAdminRequestAuthorized } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const LEVELS = new Set(["info", "warn", "error", "debug"]);

function parseLimit(raw: string | null): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (Number.isNaN(n) || n < 1) return 200;
  return Math.min(200, n);
}

export async function GET(req: Request) {
  if (!isAdminRequestAuthorized(req)) return adminForbiddenResponse();

  const url = new URL(req.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const levelRaw = url.searchParams.get("level")?.trim();
  const typeRaw = url.searchParams.get("type")?.trim();
  const qRaw = url.searchParams.get("q")?.trim().toLowerCase();

  const where: Prisma.AdminEventWhereInput = {};
  if (levelRaw && LEVELS.has(levelRaw)) {
    where.level = levelRaw;
  }
  if (typeRaw) {
    where.type = typeRaw;
  }

  const take = qRaw ? Math.min(500, limit * 3) : limit;
  const rows = await prisma.adminEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
  });

  const filtered = qRaw ? rows.filter((r) => r.message.toLowerCase().includes(qRaw)) : rows;

  return NextResponse.json({ events: filtered.slice(0, limit) });
}
