import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { ensureSessionUser } from "@/lib/session-user";
import type { UserOnboardingProfileData } from "@/lib/onboarding/onboarding-types";

export const dynamic = "force-dynamic";

const MAX_HANDLE = 120;
const MAX_TYPE = 80;
const MAX_NICHE = 40;
const MAX_NICHES = 12;
const MAX_LINK = 500;
const MAX_LINKS = 12;

function clip(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  return s.trim().slice(0, max);
}

function clipList(raw: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    const v = clip(item, maxLen);
    if (!v) continue;
    if (!out.includes(v)) out.push(v);
    if (out.length >= maxItems) break;
  }
  return out;
}

function serializeProfile(row: {
  instagramUsername: string;
  tiktokUsername: string;
  youtubeChannel: string;
  creatorType: string;
  contentNiches: string[];
  referenceLinks: string[];
  onboardingDoneAt: Date | null;
}): UserOnboardingProfileData {
  return {
    instagramUsername: row.instagramUsername,
    tiktokUsername: row.tiktokUsername,
    youtubeChannel: row.youtubeChannel,
    creatorType: row.creatorType,
    contentNiches: row.contentNiches,
    referenceLinks: row.referenceLinks,
    onboardingDoneAt: row.onboardingDoneAt?.toISOString() ?? null,
  };
}

export const GET = withApiRoute("user.profile.GET", async () => {
  const { userId } = await ensureSessionUser();
  const profile = await prisma.userOnboardingProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  return NextResponse.json({ profile: serializeProfile(profile) });
});

export async function POST(req: Request) {
  const { userId } = await ensureSessionUser();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const markDone = o.markOnboardingDone === true;

  const profile = await prisma.userOnboardingProfile.upsert({
    where: { userId },
    create: {
      userId,
      instagramUsername: clip(o.instagramUsername, MAX_HANDLE),
      tiktokUsername: clip(o.tiktokUsername, MAX_HANDLE),
      youtubeChannel: clip(o.youtubeChannel, MAX_HANDLE),
      creatorType: clip(o.creatorType, MAX_TYPE),
      contentNiches: clipList(o.contentNiches, MAX_NICHES, MAX_NICHE),
      referenceLinks: clipList(o.referenceLinks, MAX_LINKS, MAX_LINK),
      onboardingDoneAt: markDone ? new Date() : null,
    },
    update: {
      instagramUsername: clip(o.instagramUsername, MAX_HANDLE),
      tiktokUsername: clip(o.tiktokUsername, MAX_HANDLE),
      youtubeChannel: clip(o.youtubeChannel, MAX_HANDLE),
      creatorType: clip(o.creatorType, MAX_TYPE),
      contentNiches: clipList(o.contentNiches, MAX_NICHES, MAX_NICHE),
      referenceLinks: clipList(o.referenceLinks, MAX_LINKS, MAX_LINK),
      ...(markDone ? { onboardingDoneAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ profile: serializeProfile(profile) });
}
