import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { linkAuthUserToSessionUser } from "@/lib/auth-bridge";
import { logAdminEvent } from "@/lib/admin-events";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "viral_session_id";
const DEFAULT_BALANCE = 12_400;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidSessionKey(raw: string | undefined): raw is string {
  return Boolean(raw && UUID_RE.test(raw.trim()));
}

/**
 * Гарантирует httpOnly cookie с session id и строку SessionUser в БД.
 * Баланс хранится только в UserTokenBalance.
 */
async function ensureBalance(userId: string) {
  const row = await prisma.userTokenBalance.findUnique({ where: { userId } });
  if (!row) {
    await prisma.userTokenBalance.create({
      data: { userId, balance: DEFAULT_BALANCE },
    });
  }
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
    await ensureBalance(user.id);
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

  return prisma.$transaction(async (tx) => {
    let user = await tx.sessionUser.findUnique({
      where: { sessionKey: key },
      include: { userTokenBalance: true },
    });
    if (!user) {
      user = await tx.sessionUser.create({
        data: {
          sessionKey: key,
          userTokenBalance: { create: { balance: DEFAULT_BALANCE } },
        },
        include: { userTokenBalance: true },
      });
    } else if (!user.userTokenBalance) {
      await tx.userTokenBalance.create({
        data: { userId: user.id, balance: DEFAULT_BALANCE },
      });
    }
    return { userId: user.id, sessionKey: key };
  });
}

export async function getTokenBalance(): Promise<number> {
  const { userId } = await ensureSessionUser();
  return getTokenBalanceForUser(userId);
}

export async function getTokenBalanceForUser(userId: string): Promise<number> {
  const row = await prisma.userTokenBalance.findUnique({
    where: { userId },
    select: { balance: true },
  });
  return row?.balance ?? DEFAULT_BALANCE;
}

/**
 * Списание с записью в TokenTransaction. Только сервер.
 */
export async function spendTokens(
  userId: string,
  amount: number,
  reason: string,
  ctx?: { sessionId?: string },
): Promise<{ ok: boolean; balance: number }> {
  if (amount <= 0) {
    const row = await prisma.userTokenBalance.findUnique({
      where: { userId },
      select: { balance: true },
    });
    return { ok: true, balance: row?.balance ?? DEFAULT_BALANCE };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.userTokenBalance.upsert({
        where: { userId },
        create: { userId, balance: DEFAULT_BALANCE },
        update: {},
      });
      const row = await tx.userTokenBalance.findUniqueOrThrow({
        where: { userId },
        select: { balance: true },
      });
      if (row.balance < amount) {
        return { ok: false as const, balance: row.balance, spent: false as const };
      }
      const updated = await tx.userTokenBalance.update({
        where: { userId },
        data: { balance: { decrement: amount } },
        select: { balance: true },
      });
      await tx.tokenTransaction.create({
        data: { userId, amount: -amount, reason },
      });
      return { ok: true as const, balance: updated.balance, spent: true as const };
    });
    if (!result.ok) {
      await logAdminEvent({
        level: "warn",
        type: "token_spend",
        message: "Недостаточно токенов",
        sessionId: ctx?.sessionId,
        userId,
        meta: { reason, amount, balance: result.balance },
      });
      return { ok: false, balance: result.balance };
    }
    if (result.spent) {
      await logAdminEvent({
        level: "info",
        type: "token_spend",
        message: "Списание токенов",
        sessionId: ctx?.sessionId,
        userId,
        meta: { reason, amount, balanceAfter: result.balance },
      });
    }
    return { ok: true, balance: result.balance };
  } catch (e) {
    console.warn("[token-wallet] spend failed", e instanceof Error ? e.message : e);
    void logAdminEvent({
      level: "error",
      type: "token_spend",
      message: "Ошибка списания токенов",
      sessionId: ctx?.sessionId,
      userId,
      meta: { reason, amount, error: e instanceof Error ? { name: e.name, message: e.message } : String(e) },
    });
    const row = await prisma.userTokenBalance.findUnique({
      where: { userId },
      select: { balance: true },
    });
    return { ok: false, balance: row?.balance ?? 0 };
  }
}

/**
 * Возврат токенов на баланс (положительная запись в TokenTransaction).
 */
export async function creditTokens(
  userId: string,
  amount: number,
  reason: string,
  ctx?: { sessionId?: string },
): Promise<{ ok: boolean; balance: number }> {
  if (amount <= 0) {
    const row = await prisma.userTokenBalance.findUnique({
      where: { userId },
      select: { balance: true },
    });
    return { ok: true, balance: row?.balance ?? DEFAULT_BALANCE };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.userTokenBalance.upsert({
        where: { userId },
        create: { userId, balance: DEFAULT_BALANCE },
        update: {},
      });
      const row = await tx.userTokenBalance.update({
        where: { userId },
        data: { balance: { increment: amount } },
        select: { balance: true },
      });
      await tx.tokenTransaction.create({
        data: { userId, amount, reason },
      });
      return row.balance;
    });
    void logAdminEvent({
      level: "info",
      type: "token_spend",
      message: "Начисление токенов (возврат)",
      sessionId: ctx?.sessionId,
      userId,
      meta: { reason, amount, balanceAfter: updated },
    });
    return { ok: true, balance: updated };
  } catch (e) {
    console.warn("[token-wallet] credit failed", e instanceof Error ? e.message : e);
    void logAdminEvent({
      level: "error",
      type: "token_spend",
      message: "Ошибка начисления токенов",
      sessionId: ctx?.sessionId,
      userId,
      meta: { reason, amount, error: e instanceof Error ? { name: e.name, message: e.message } : String(e) },
    });
    const row = await prisma.userTokenBalance.findUnique({
      where: { userId },
      select: { balance: true },
    });
    return { ok: false, balance: row?.balance ?? 0 };
  }
}
