/**
 * Instagram thumbnail diagnostics — DB stats + HTTP/DNS probes.
 * Run: npx tsx --tsconfig tsconfig.json scripts/diagnose-instagram-thumbnails.ts [--sample=40]
 */
import dns from "node:dns/promises";
import { URL } from "node:url";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function probeThumbnailHead(url: string, timeoutMs = 4_000): Promise<boolean> {
  if (!url?.trim()) return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { method: "HEAD", signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    return res.ok && (res.headers.get("content-type")?.startsWith("image/") ?? true);
  } catch {
    return false;
  }
}

type ProbeResult = {
  httpStatus: number | null;
  ok: boolean;
  errorKind: "ok" | "timeout" | "dns" | "http" | "not_image" | "empty" | "fetch";
  dnsOk: boolean | null;
  dnsError: string | null;
  hostname: string | null;
  urlAgeDays: number | null;
};

async function probeUrlDetailed(url: string, timeoutMs = 6_000): Promise<ProbeResult> {
  const trimmed = url?.trim();
  if (!trimmed) {
    return {
      httpStatus: null,
      ok: false,
      errorKind: "empty",
      dnsOk: null,
      dnsError: null,
      hostname: null,
      urlAgeDays: guessUrlAgeDays(trimmed),
    };
  }

  let hostname: string | null = null;
  try {
    hostname = new URL(trimmed).hostname;
  } catch {
    return {
      httpStatus: null,
      ok: false,
      errorKind: "fetch",
      dnsOk: null,
      dnsError: "invalid_url",
      hostname: null,
      urlAgeDays: null,
    };
  }

  let dnsOk: boolean | null = null;
  let dnsError: string | null = null;
  try {
    await dns.lookup(hostname);
    dnsOk = true;
  } catch (e) {
    dnsOk = false;
    dnsError = e instanceof Error ? e.message : String(e);
  }

  if (dnsOk === false) {
    return {
      httpStatus: null,
      ok: false,
      errorKind: "dns",
      dnsOk,
      dnsError,
      hostname,
      urlAgeDays: guessUrlAgeDays(trimmed),
    };
  }

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(trimmed, {
      method: "GET",
      signal: ctrl.signal,
      redirect: "follow",
      headers: { Accept: "image/*,*/*", Range: "bytes=0-1023" },
    });
    clearTimeout(t);
    const ct = res.headers.get("content-type") ?? "";
    const imageOk = res.ok && (ct.startsWith("image/") || ct.includes("octet-stream"));
    return {
      httpStatus: res.status,
      ok: imageOk,
      errorKind: imageOk ? "ok" : res.ok ? "not_image" : "http",
      dnsOk,
      dnsError,
      hostname,
      urlAgeDays: guessUrlAgeDays(trimmed),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isTimeout =
      (e instanceof Error && e.name === "AbortError") || /abort|timeout/i.test(msg);
    const isDns = /ENOTFOUND|getaddrinfo|EAI_AGAIN/i.test(msg);
    return {
      httpStatus: null,
      ok: false,
      errorKind: isTimeout ? "timeout" : isDns ? "dns" : "fetch",
      dnsOk,
      dnsError: isDns ? msg : dnsError,
      hostname,
      urlAgeDays: guessUrlAgeDays(trimmed),
    };
  }
}

/** Heuristic: IG CDN signed URLs often embed expiry in `oe` hex timestamp. */
function guessUrlAgeDays(url: string): number | null {
  try {
    const u = new URL(url);
    const oe = u.searchParams.get("oe");
    if (!oe || !/^[0-9a-f]+$/i.test(oe)) return null;
    const expSec = parseInt(oe, 16);
    if (!Number.isFinite(expSec) || expSec < 1_500_000_000) return null;
    const exp = new Date(expSec * 1000);
    const daysUntil = (exp.getTime() - Date.now()) / (86400 * 1000);
    return Math.round((-daysUntil) * 10) / 10;
  } catch {
    return null;
  }
}

async function main() {
  const sampleArg = process.argv.find((a) => a.startsWith("--sample="));
  const sampleSize = Math.min(80, Math.max(5, Number(sampleArg?.split("=")[1]) || 30));

  const all = await prisma.video.findMany({
    where: { platform: "instagram" },
    select: {
      externalId: true,
      thumbnailUrl: true,
      thumbnailStatus: true,
      thumbnailFailCount: true,
      updatedAt: true,
      lastFetchedAt: true,
      url: true,
    },
  });

  const emptyUrl = all.filter((v) => !v.thumbnailUrl?.trim());
  const invalidStatus = all.filter((v) => v.thumbnailStatus === "invalid");
  const nullStatus = all.filter((v) => v.thumbnailStatus == null);
  const withUrl = all.filter((v) => v.thumbnailUrl?.trim());

  const homeEligible = await prisma.video.count({
    where: {
      platform: "instagram",
      durationSeconds: { lte: 60 },
      views: { gte: 500 },
      NOT: [{ thumbnailStatus: "invalid" }, { thumbnailUrl: null }, { thumbnailUrl: "" }],
      thumbnailUrl: { not: null },
    },
  });

  console.log("\n=== Instagram thumbnail DB stats ===");
  console.log({
    totalInstagram: all.length,
    emptyThumbnailUrl: emptyUrl.length,
    invalidThumbnailStatus: invalidStatus.length,
    nullThumbnailStatus: nullStatus.length,
    withThumbnailUrl: withUrl.length,
    homeFeedEligible: homeEligible,
    failCountGte1: all.filter((v) => v.thumbnailFailCount >= 1).length,
    failCountGte3: all.filter((v) => v.thumbnailFailCount >= 3).length,
  });

  const hostCounts = new Map<string, number>();
  for (const v of withUrl) {
    try {
      const h = new URL(v.thumbnailUrl!.trim()).hostname;
      hostCounts.set(h, (hostCounts.get(h) ?? 0) + 1);
    } catch {
      hostCounts.set("(invalid)", (hostCounts.get("(invalid)") ?? 0) + 1);
    }
  }
  console.log("\nTop thumbnail hosts:");
  [...hostCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .forEach(([h, n]) => console.log(`  ${h}: ${n}`));

  const pick = [...withUrl]
    .sort((a, b) => (b.thumbnailFailCount ?? 0) - (a.thumbnailFailCount ?? 0))
    .slice(0, Math.min(sampleSize, withUrl.length));

  const freshPick = [...withUrl]
    .filter((v) => (v.thumbnailFailCount ?? 0) === 0 && v.thumbnailStatus !== "invalid")
    .slice(0, Math.min(15, withUrl.length));

  const toProbe = [...new Map([...pick, ...freshPick].map((v) => [v.externalId, v])).values()];

  console.log(`\n=== Probing ${toProbe.length} thumbnail URLs (HTTP + DNS) ===\n`);

  const byError = new Map<string, number>();
  let broken = 0;

  for (const v of toProbe) {
    const url = v.thumbnailUrl!.trim();
    const detailed = await probeUrlDetailed(url);
    const headOk = await probeThumbnailHead(url);
    if (!detailed.ok) broken++;

    const key = detailed.errorKind === "http" && detailed.httpStatus
      ? `http_${detailed.httpStatus}`
      : detailed.errorKind;
    byError.set(key, (byError.get(key) ?? 0) + 1);

    console.log({
      externalId: v.externalId,
      thumbnailStatus: v.thumbnailStatus,
      failCount: v.thumbnailFailCount,
      hostname: detailed.hostname,
      httpStatus: detailed.httpStatus,
      headOk,
      errorKind: detailed.errorKind,
      dnsOk: detailed.dnsOk,
      dnsError: detailed.dnsError?.slice(0, 80),
      urlAgeDays: detailed.urlAgeDays,
      lastFetchedAt: v.lastFetchedAt?.toISOString() ?? null,
      updatedAt: v.updatedAt.toISOString(),
      urlPreview: url.slice(0, 100) + (url.length > 100 ? "…" : ""),
    });
  }

  console.log("\n=== Probe summary (sample) ===");
  console.log({ probed: toProbe.length, brokenInSample: broken });
  console.log("By error kind:", Object.fromEntries(byError));

  const expiredGuess = toProbe.filter((v) => {
    const age = guessUrlAgeDays(v.thumbnailUrl!.trim());
    return age != null && age > 0;
  }).length;
  console.log({ likelyExpiredByOeParam: expiredGuess });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
