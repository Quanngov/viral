/* eslint-disable no-console */
/**
 * Per-query Prisma trace for the slow routes.
 *
 * Usage (server must run with PERF_AUDIT=1 PERF_TRACE=1):
 *   node scripts/perf-query-trace.mjs
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const REPEAT = Number(process.env.PERF_REPEAT ?? 2);

const ROUTES = [
  { name: "api.user.profile.hub", path: "/api/user/profile/hub" },
  { name: "api.user.dashboard.home", path: "/api/user/dashboard/home" },
  { name: "api.tokens", path: "/api/tokens" },
  { name: "api.billing.me", path: "/api/billing/me" },
];

// Persist the session cookie across requests so we measure the returning-user
// path (existing rows) instead of first-time-user creation on every request.
let cookieJar = "";

function captureCookie(res) {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return;
  const m = setCookie.match(/viral_session_id=[^;]+/);
  if (m) cookieJar = m[0];
}

function decodeTrace(res) {
  const raw = res.headers.get("x-perf-prisma-trace");
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

async function hit(route) {
  const t0 = performance.now();
  const res = await fetch(`${BASE_URL}${route.path}`, {
    cache: "no-store",
    headers: cookieJar ? { cookie: cookieJar } : {},
  });
  const t1 = performance.now();
  captureCookie(res);
  await res.text().catch(() => "");
  return {
    status: res.status,
    wallMs: Math.round(t1 - t0),
    perfMs: res.headers.get("x-perf-ms"),
    prismaQ: res.headers.get("x-perf-prisma-queries"),
    prismaMs: res.headers.get("x-perf-prisma-ms"),
    ext: res.headers.get("x-perf-external-calls"),
    trace: decodeTrace(res),
  };
}

function pad(s, n) {
  const x = String(s);
  return x.length >= n ? x : x + " ".repeat(n - x.length);
}

async function main() {
  console.log(`[perf-query-trace] base=${BASE_URL} repeat=${REPEAT}\n`);

  // Establish a session + billing rows first (so measured runs hit the warm path).
  await hit({ name: "warmup", path: "/api/tokens" });
  await hit({ name: "warmup", path: "/api/billing/me" });
  await hit({ name: "warmup", path: "/api/user/profile/hub" });
  await hit({ name: "warmup", path: "/api/user/dashboard/home" });

  for (const route of ROUTES) {
    let last = null;
    // Warm + measured runs; keep the last (warm) run's trace.
    for (let i = 0; i < REPEAT; i++) {
      last = await hit(route);
    }
    console.log("=".repeat(80));
    console.log(
      `${route.name}  status=${last.status}  wall=${last.wallMs}ms  route=${last.perfMs}ms  prisma=${last.prismaQ}q/${last.prismaMs}ms  ext=${last.ext}`,
    );
    if (!last.trace) {
      console.log("  (no trace header — is PERF_TRACE=1 set on the server?)");
      continue;
    }
    // Aggregate by query name.
    const agg = new Map();
    for (const t of last.trace) {
      const cur = agg.get(t.q) ?? { count: 0, totalMs: 0, maxMs: 0, rows: 0 };
      cur.count += 1;
      cur.totalMs += t.ms;
      cur.maxMs = Math.max(cur.maxMs, t.ms);
      cur.rows += t.rows ?? 0;
      agg.set(t.q, cur);
    }

    console.log("");
    console.log(
      "  " + pad("#", 4) + pad("query", 42) + pad("ms", 8) + "rows",
    );
    last.trace.forEach((t, i) => {
      console.log("  " + pad(i + 1, 4) + pad(t.q, 42) + pad(t.ms, 8) + (t.rows ?? "-"));
    });

    console.log("");
    console.log("  aggregated by query:");
    console.log(
      "  " + pad("query", 42) + pad("count", 8) + pad("totalMs", 10) + pad("maxMs", 8) + "rows",
    );
    [...agg.entries()]
      .sort((a, b) => b[1].totalMs - a[1].totalMs)
      .forEach(([name, v]) => {
        console.log(
          "  " +
            pad(name, 42) +
            pad(v.count, 8) +
            pad(v.totalMs, 10) +
            pad(v.maxMs, 8) +
            v.rows,
        );
      });
    console.log("");
  }
}

await main();
