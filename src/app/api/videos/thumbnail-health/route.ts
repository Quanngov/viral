import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { markThumbnailValid, recordThumbnailFailure } from "@/lib/thumbnail-health";

export const dynamic = "force-dynamic";

export const POST = withApiRoute("videos.thumbnail-health.POST", async (req) => {
  const body = (await req.json()) as {
    platform?: string;
    externalId?: string;
    ok?: boolean;
  };
  const platform = body.platform?.trim();
  const externalId = body.externalId?.trim();
  if (!platform || !externalId) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (body.ok) {
    await markThumbnailValid(platform, externalId);
    return NextResponse.json({ status: "valid" });
  }

  const result = await recordThumbnailFailure(platform, externalId);
  if (result.action === "recovered") {
    return NextResponse.json({
      status: "recovered",
      thumbnailUrl: result.thumbnailUrl,
      failCount: 0,
    });
  }
  return NextResponse.json(result);
});
