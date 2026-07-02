import { NextResponse } from "next/server";
import { adminForbiddenResponse, isAdminRequestAuthorized } from "@/lib/admin-auth";
import { getPromptCatalog } from "@/lib/admin/prompt-catalog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAdminRequestAuthorized(req)) return adminForbiddenResponse();
  return NextResponse.json({ prompts: getPromptCatalog() });
}
