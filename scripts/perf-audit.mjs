/* eslint-disable no-console */
/**
 * PERF audit runner.
 *
 * Usage:
 *   PERF_AUDIT=1 node scripts/perf-audit.mjs
 *
 * Assumes the app is running locally (next dev / next start) on BASE_URL.
 * Reads x-perf-* headers emitted by withApiRoute().
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

const ROUTES = [
  // Landing / static
  { name: "landing", method: "GET", path: "/landing", expectPerfHeaders: false },

  // Dashboard page (SSR payload + shell)
  { name: "homepage", method: "GET", path: "/", expectPerfHeaders: false },

  // Core API calls during dashboard load
  { name: "api.dashboard.home", method: "GET", path: "/api/user/dashboard/home" },
  { name: "api.tokens", method: "GET", path: "/api/tokens" },
  { name: "api.billing.me", method: "GET", path: "/api/billing/me" },

  // Profile
  { name: "api.profile.hub", method: "GET", path: "/api/user/profile/hub" },

  // Saved videos
  { name: "api.saved.list", method: "GET", path: "/api/saved-videos" },
  { name: "api.saved.state", method: "GET", path: "/api/saved-videos/state" },

  // Trends
  { name: "api.trends.realtime", method: "GET", path: "/api/trends/realtime" },
];

function getPerfHeaders(res) {
  const keys = [
    "x-perf-ms",
    "x-perf-prisma-queries",
    "x-perf-prisma-ms",
    "x-perf-prisma-slow-top",
    "x-perf-external-calls",
  ];
  const out = {};
  for (const k of keys) {
    const v = res.headers.get(k);
    if (v != null) out[k] = v;
  }
  return out;
}

async function hit(route) {
  const url = `${BASE_URL}${route.path}`;
  const t0 = performance.now();
  const res = await fetch(url, { method: route.method, redirect: "manual" });
  const t1 = performance.now();

  const bodySample = await res
    .text()
    .then((t) => t.slice(0, 200))
    .catch(() => "");

  return {
    name: route.name,
    url,
    status: res.status,
    wallMs: Math.round(t1 - t0),
    perf: getPerfHeaders(res),
    bodySample,
  };
}

function pad(s, n) {
  const x = String(s);
  return x.length >= n ? x : x + " ".repeat(n - x.length);
}

async function main() {
  console.log(`[perf-audit] base=${BASE_URL}`);
  const results = [];
  for (const r of ROUTES) {
    try {
      results.push(await hit(r));
    } catch (e) {
      results.push({ name: r.name, url: `${BASE_URL}${r.path}`, status: "ERR", wallMs: "-", perf: {}, bodySample: String(e) });
    }
  }

  console.log("");
  console.log(
    pad("route", 22) +
      pad("status", 8) +
      pad("wall", 8) +
      pad("x-perf-ms", 12) +
      pad("prisma(q)", 12) +
      pad("prisma(ms)", 12) +
      pad("ext", 6) +
      "slow-top",
  );
  for (const r of results) {
    console.log(
      pad(r.name, 22) +
        pad(r.status, 8) +
        pad(r.wallMs, 8) +
        pad(r.perf["x-perf-ms"] ?? "-", 12) +
        pad(r.perf["x-perf-prisma-queries"] ?? "-", 12) +
        pad(r.perf["x-perf-prisma-ms"] ?? "-", 12) +
        pad(r.perf["x-perf-external-calls"] ?? "-", 6) +
        (r.perf["x-perf-prisma-slow-top"] ?? "-"),
    );
  }

  // Hard requirement: landing must not require DB or authenticated calls.
  console.log("");
  const landing = results.find((r) => r.name === "landing");
  if (landing) {
    console.log(`[perf-audit] landing status=${landing.status} wall=${landing.wallMs}ms`);
    console.log(
      `[perf-audit] landing note: this script cannot see Prisma for pages; DB isolation is enforced by code (no prisma import in landing lib).`,
    );
  }
}

await main();

