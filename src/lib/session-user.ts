import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { linkAuthUserToSessionUser } from "@/lib/auth-bridge";
import { ensureBillingForUser } from "@/lib/billing/billing-service";
import { getWalletSnapshot } from "@/lib/billing/billing-service";
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
    await ensureBillingForUser(user.id);
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

  const user = await prisma.$transaction(async (tx) => {
    let row = await tx.sessionUser.findUnique({
      where: { sessionKey: key },
      select: { id: true, sessionKey: true },
    });
    if (!row) {
      row = await tx.sessionUser.create({
        data: { sessionKey: key },
        select: { id: true, sessionKey: true },
      });
    }
    return row;
  });

  await ensureBillingForUser(user.id);
  return { userId: user.id, sessionKey: user.sessionKey };
}

export async function getTokenBalance(): Promise<number> {
  const { userId } = await ensureSessionUser();
  const wallet = await getWalletSnapshot(userId, { skipEnsureBilling: true });
  return wallet.balance;
}
