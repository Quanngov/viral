import type { Video } from "@prisma/client";
import type { FeedPlatformMode } from "@/lib/search-query";

export type SmartMixMode = "search" | "more";

export type PickSmartMixOptions = {
  mode: SmartMixMode;
  now: Date;
  platformFilter: FeedPlatformMode;
  minViewsFloor: number;
  mixSeed: string;
};

function effectiveRating(v: Video): number {
  return v.rating > 0 ? v.rating : v.score;
}

function ageDays(v: Video, now: Date): number {
  return (now.getTime() - v.publishedAt.getTime()) / 86400000;
}

type Bucket = "hot7" | "strong30" | "medium30" | "filler";

function classifyBucket(v: Video, now: Date, minViewsFloor: number): Bucket | null {
  const r = effectiveRating(v);
  const age = ageDays(v, now);
  const w = v.views;
  const sMin = Math.max(50_000, minViewsFloor);
  const mMin = Math.max(10_000, minViewsFloor);

  if (age <= 7 && r >= 70) return "hot7";
  if (age <= 30 && w >= sMin && r >= 55) return "strong30";
  if (age <= 30 && w >= mMin && r >= 40) return "medium30";
  if (w >= 1) return "filler";
  return null;
}

function shuffleInPlace<T>(arr: T[], rng: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function splitBucketTargets(size: number, mode: SmartMixMode) {
  const [ph, ps] = mode === "search" ? [0.55, 0.35, 0.1] : [0.35, 0.45, 0.2];
  let h = Math.round(size * ph);
  let s = Math.round(size * ps);
  let mf = size - h - s;
  if (mf < 0) {
    mf = 0;
    const over = h + s - size;
    if (over > 0) {
      const cutS = Math.min(s, over);
      s -= cutS;
    }
    const over2 = h + s - size;
    if (over2 > 0) h = Math.max(0, h - over2);
  }
  mf = Math.max(0, size - h - s);
  const med = Math.round(mf * 0.7);
  const fil = mf - med;
  return { h, s, med, fil };
}

function byRatingThenViews(a: Video, b: Video) {
  const dr = effectiveRating(b) - effectiveRating(a);
  if (dr !== 0) return dr;
  return b.views - a.views;
}

function victimSwapScore(v: Video): number {
  const r = effectiveRating(v);
  return v.platform === "instagram" ? r + 400 : r;
}

function injectInstagramIfNeeded(
  out: Video[],
  candidates: Video[],
  size: number,
  opts: PickSmartMixOptions,
): void {
  if (opts.platformFilter !== "all" || size <= 0) return;
  const igAll = candidates.filter((v) => v.platform === "instagram");
  if (igAll.length === 0) return;

  const target = Math.min(igAll.length, Math.max(1, Math.min(2, Math.ceil(size * 0.25))));
  const outSet = new Set(out.map((v) => v.id));
  let have = out.filter((v) => v.platform === "instagram").length;
  if (have >= target) return;

  const pool = igAll
    .filter((v) => !outSet.has(v.id))
    .sort((a, b) => byRatingThenViews(a, b));

  while (have < target && pool.length) {
    const add = pool.shift()!;
    if (out.length === 0) break;
    let worst = 0;
    let worstScore = Infinity;
    for (let i = 0; i < out.length; i++) {
      const sc = victimSwapScore(out[i]!);
      if (sc < worstScore) {
        worstScore = sc;
        worst = i;
      }
    }
    const victim = out[worst]!;
    if (victim.platform === "instagram" && effectiveRating(victim) >= effectiveRating(add)) {
      break;
    }
    outSet.delete(victim.id);
    outSet.add(add.id);
    out[worst] = add;
    have++;
  }
}

/**
 * Бакеты по возрасту/просмотрам/рейтингу + доли для search / more; при platform=all подмешивает Instagram.
 */
export function pickSmartMixedBatch(
  candidates: Video[],
  batchIndex: number,
  size: number,
  opts: PickSmartMixOptions,
): Video[] {
  if (candidates.length === 0 || size <= 0) return [];

  const seedNum = [...opts.mixSeed].reduce((a, c) => a + c.charCodeAt(0), 0) + batchIndex * 997;
  const rng = mulberry32(seedNum);

  const buckets: Record<Bucket, Video[]> = {
    hot7: [],
    strong30: [],
    medium30: [],
    filler: [],
  };

  for (const v of candidates) {
    const b = classifyBucket(v, opts.now, opts.minViewsFloor);
    if (b) buckets[b].push(v);
  }

  for (const k of Object.keys(buckets) as Bucket[]) {
    buckets[k].sort(byRatingThenViews);
    shuffleInPlace(buckets[k], rng);
  }

  const { h: wantH, s: wantS, med: wantMed, fil: wantFil } = splitBucketTargets(size, opts.mode);

  const takeCap = (pool: Video[], want: number) => Math.min(want, pool.length);

  let th = takeCap(buckets.hot7, wantH);
  let ts = takeCap(buckets.strong30, wantS);
  let tm = takeCap(buckets.medium30, wantMed);
  let tf = takeCap(buckets.filler, wantFil);

  const shiftDeficit = () => {
    let total = th + ts + tm + tf;
    if (total >= size) return;
    const pools: { key: Bucket; ref: () => number; set: (n: number) => void; arr: Video[] }[] = [
      { key: "filler", ref: () => tf, set: (n) => (tf = n), arr: buckets.filler },
      { key: "medium30", ref: () => tm, set: (n) => (tm = n), arr: buckets.medium30 },
      { key: "strong30", ref: () => ts, set: (n) => (ts = n), arr: buckets.strong30 },
      { key: "hot7", ref: () => th, set: (n) => (th = n), arr: buckets.hot7 },
    ];
    for (const p of pools) {
      while (total < size && p.ref() < p.arr.length) {
        p.set(p.ref() + 1);
        total++;
      }
      if (total >= size) break;
    }
  };

  shiftDeficit();

  const hot7 = buckets.hot7.slice(0, th);
  const strong30 = buckets.strong30.slice(0, ts);
  const medium30 = buckets.medium30.slice(0, tm);
  const filler = buckets.filler.slice(0, tf);

  const used = new Set<string>();
  const out: Video[] = [];

  const pushUnique = (arr: Video[]) => {
    for (const v of arr) {
      if (out.length >= size) return;
      if (used.has(v.id)) continue;
      used.add(v.id);
      out.push(v);
    }
  };

  pushUnique(hot7);
  pushUnique(strong30);
  pushUnique(medium30);
  pushUnique(filler);

  if (out.length < size) {
    const rest = [...candidates].filter((v) => !used.has(v.id)).sort(byRatingThenViews);
    shuffleInPlace(rest, rng);
    pushUnique(rest);
  }

  if (out.length < size) {
    for (const v of [...candidates].sort(byRatingThenViews)) {
      if (out.length >= size) break;
      if (!used.has(v.id)) {
        used.add(v.id);
        out.push(v);
      }
    }
  }

  injectInstagramIfNeeded(out, candidates, size, opts);

  return out.slice(0, size);
}
