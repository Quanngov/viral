import { NextResponse } from "next/server";
import dns from "node:dns/promises";
import { adminForbiddenResponse, isAdminRequestAuthorized } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { recoverInstagramThumbnail } from "@/lib/thumbnail-recovery";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function guessUrlExpiry(url: string): { expired: boolean; daysPastExpiry: number | null } {
  try {
    const oe = new URL(url).searchParams.get("oe");
    if (!oe || !/^[0-9a-f]+$/i.test(oe)) return { expired: false, daysPastExpiry: null };
    const expMs = parseInt(oe, 16) * 1000;
    if (!Number.isFinite(expMs)) return { expired: false, daysPastExpiry: null };
    const daysPast = (Date.now() - expMs) / 86400_000;
    return { expired: daysPast > 0, daysPastExpiry: Math.round(daysPast * 10) / 10 };
  } catch {
    return { expired: false, daysPastExpiry: null };
  }
}

async function probeRow(url: string) {
  let hostname: string | null = null;
  let dnsOk: boolean | null = null;
  let dnsError: string | null = null;
  try {
    hostname = new URL(url).hostname;
    await dns.lookup(hostname);
    dnsOk = true;
  } catch (e) {
    dnsOk = false;
    dnsError = e instanceof Error ? e.message : String(e);
  }

  let httpStatus: number | null = null;
  let fetchError: string | null = null;
  if (dnsOk) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5_000);
      const res = await fetch(url, {
        method: "GET",
        signal: ctrl.signal,
        redirect: "follow",
        headers: { Range: "bytes=0-512", Accept: "image/*" },
      });
      clearTimeout(t);
      httpStatus = res.status;
    } catch (e) {
      fetchError = e instanceof Error ? e.message : String(e);
    }
  }

  const expiry = guessUrlExpiry(url);
  return { hostname, dnsOk, dnsError, httpStatus, fetchError, ...expiry };
}

export async function GET(req: Request) {
  if (!isAdminRequestAuthorized(req)) return adminForbiddenResponse();

  const url = new URL(req.url);
  const sample = Math.min(50, Math.max(1, Number(url.searchParams.get("sample")) || 15));
  const tryRecover = url.searchParams.get("recover") === "1";

  const all = await prisma.video.findMany({
    where: { platform: "instagram" },
    select: {
      externalId: true,
      thumbnailUrl: true,
      thumbnailStatus: true,
      thumbnailFailCount: true,
      lastFetchedAt: true,
      updatedAt: true,
    },
  });

  const stats = {
    total: all.length,
    emptyThumbnailUrl: all.filter((v) => !v.thumbnailUrl?.trim()).length,
    invalidStatus: all.filter((v) => v.thumbnailStatus === "invalid").length,
    failCountGte1: all.filter((v) => v.thumbnailFailCount >= 1).length,
    hosts: {} as Record<string, number>,
  };

  for (const v of all) {
    const u = v.thumbnailUrl?.trim();
    if (!u) continue;
    try {
      const h = new URL(u).hostname;
      stats.hosts[h] = (stats.hosts[h] ?? 0) + 1;
    } catch {
      stats.hosts["(invalid)"] = (stats.hosts["(invalid)"] ?? 0) + 1;
    }
  }

  const sampleRows = all
    .filter((v) => v.thumbnailUrl?.trim())
    .sort((a, b) => b.thumbnailFailCount - a.thumbnailFailCount)
    .slice(0, sample);

  const probes = [];
  for (const v of sampleRows) {
    const thumb = v.thumbnailUrl!.trim();
    const row = {
      externalId: v.externalId,
      thumbnailStatus: v.thumbnailStatus,
      thumbnailFailCount: v.thumbnailFailCount,
      lastFetchedAt: v.lastFetchedAt,
      probe: await probeRow(thumb),
    };
    if (tryRecover && (row.probe.expired || row.probe.httpStatus === 403 || row.probe.dnsOk === false)) {
      const recovered = await recoverInstagramThumbnail(v.externalId);
      Object.assign(row, { recover: recovered });
    }
    probes.push(row);
  }

  return NextResponse.json({ stats, probes });
}
