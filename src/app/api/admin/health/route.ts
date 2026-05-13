import { NextResponse } from "next/server";
import { adminForbiddenResponse, isAdminRequestAuthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAdminRequestAuthorized(req)) return adminForbiddenResponse();

  const tikhub = Boolean(process.env.TIKHUB_TOKEN?.trim());
  const youtube = Boolean(process.env.YOUTUBE_API_KEY?.trim());
  const deepseek = Boolean(process.env.DEEPSEEK_API_KEY?.trim());
  const groq = Boolean(process.env.GROQ_API_KEY?.trim());
  const database = Boolean(process.env.DATABASE_URL?.trim());

  return NextResponse.json({
    tikhub: tikhub ? "connected" : "missing",
    youtube: youtube ? "connected" : "missing",
    deepseek: deepseek ? "connected" : "missing",
    groq: groq ? "connected" : "missing",
    database: database ? "connected" : "missing",
  });
}
