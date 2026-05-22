import { NextResponse } from "next/server";
import { runThumbnailCleanupBatch } from "@/lib/thumbnail-health";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Background batch — call from cron or manually; does not block dashboard. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const result = await runThumbnailCleanupBatch(limit);
  return NextResponse.json(result);
}
