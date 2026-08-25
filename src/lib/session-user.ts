import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { linkAuthUserToSessionUser } from "@/lib/auth-bridge";
import { ensureBillingForUser } from "@/lib/billing/billing-service";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "viral_session_id";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidSessionKey(raw: string | undefined): raw is string {
  return Boolean(raw && UUID_RE.test(raw.trim()));
}

export async function ensureSessionUser(): Promise<{ userId: string; sessionKey: string }> {
  const authSession = await auth();
  const authUserId = authSession?.user?.id;

  if (authUserId) {
    const appUserId = await linkAuthUserToSessionUser(authUserId);
    const user = await prisma.sessionUser.findUniqueOrThrow({
      where: { id: appUserId },
      select: { id: true, sessionKey: true },
    });
    return { userId: user.id, sessionKey: user.sessionKey };
  }

  const jar = await cookies();
  let sessionKey = jar.get(SESSION_COOKIE)?.value?.trim();

  if (!isValidSessionKey(sessionKey)) {
    sessionKey = randomUUID();
    jar.set(SESSION_COOKIE, sessionKey, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
  }

  const key = sessionKey;

  // Read-first: existing sessions (the common case) only pay a single indexed read
  // instead of an upsert write on every request.
  const existing = await prisma.sessionUser.findUnique({
    where: { sessionKey: key },
    select: { id: true, sessionKey: true },
  });
  if (existing) return { userId: existing.id, sessionKey: existing.sessionKey };

  const user = await prisma.sessionUser.upsert({
    where: { sessionKey: key },
    create: { sessionKey: key },
    update: {},
    select: { id: true, sessionKey: true },
  });

  return { userId: user.id, sessionKey: user.sessionKey };
}

export async function getTokenBalance(): Promise<number> {
  const { userId } = await ensureSessionUser();
  // ensureBillingForUser already returns the wallet row — no extra read needed.
  const { wallet } = await ensureBillingForUser(userId);
  return wallet.balance;
}
