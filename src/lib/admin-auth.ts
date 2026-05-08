import { NextResponse } from "next/server";

/**
 * TODO: Перед production закрыть /admin и /api/admin/* полноценной авторизацией.
 * Сейчас: если задан ADMIN_SECRET в env, доступ только с query-параметром key=...
 */
export function isAdminRequestAuthorized(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return true;
  const url = new URL(req.url);
  return url.searchParams.get("key") === secret;
}

export function adminForbiddenResponse() {
  return NextResponse.json({ error: "forbidden", message: "Неверный или отсутствующий ключ админки" }, { status: 403 });
}
