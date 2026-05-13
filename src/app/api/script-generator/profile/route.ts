import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSessionUser } from "@/lib/token-wallet";

export const dynamic = "force-dynamic";

const MAX = 2000;
const MAX_PROFILE_TEXT = 8000;

function clip(s: unknown): string {
  if (typeof s !== "string") return "";
  return s.trim().slice(0, MAX);
}

function clipProfileText(s: unknown): string {
  if (typeof s !== "string") return "";
  return s.trim().slice(0, MAX_PROFILE_TEXT);
}

export async function GET() {
  const { userId } = await ensureSessionUser();
  const profile = await prisma.scriptUserProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  const { userId } = await ensureSessionUser();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  if ("profileText" in o) {
    const profileText = clipProfileText(o.profileText);
    const profile = await prisma.scriptUserProfile.upsert({
      where: { userId },
      create: {
        userId,
        profileText,
        occupation: "",
        targetAudience: "",
        tone: "",
        cta: "",
        restrictions: "",
      },
      update: {
        profileText,
        occupation: "",
        targetAudience: "",
        tone: "",
        cta: "",
        restrictions: "",
      },
    });
    return NextResponse.json({ profile });
  }

  const profile = await prisma.scriptUserProfile.upsert({
    where: { userId },
    create: {
      userId,
      occupation: clip(o.occupation),
      targetAudience: clip(o.targetAudience),
      tone: clip(o.tone),
      cta: clip(o.cta),
      restrictions: clip(o.restrictions),
    },
    update: {
      occupation: clip(o.occupation),
      targetAudience: clip(o.targetAudience),
      tone: clip(o.tone),
      cta: clip(o.cta),
      restrictions: clip(o.restrictions),
    },
  });
  return NextResponse.json({ profile });
}
