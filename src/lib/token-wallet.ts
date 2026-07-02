import "server-only";

import {
  ensureBillingForUser,
  getWalletSnapshot,
  refundTokens,
  spendTokensLedger,
} from "@/lib/billing/billing-service";
import { logAdminEvent } from "@/lib/admin-events";
import { prisma } from "@/lib/prisma";

/**
 * Проверка баланса без списания.
 */
export async function checkTokenBalance(userId: string, amount: number): Promise<{ ok: boolean; balance: number }> {
  await ensureBillingForUser(userId);
  const wallet = await getWalletSnapshot(userId);
  return { ok: wallet.balance >= amount, balance: wallet.balance };
}

/**
 * Списание с записью в ledger. Только сервер.
 */
export async function spendTokens(
  userId: string,
  amount: number,
  reason: string,
  ctx?: { sessionId?: string; source?: string },
): Promise<{ ok: boolean; balance: number }> {
  await ensureBillingForUser(userId);

  if (amount <= 0) {
    const wallet = await getWalletSnapshot(userId);
    return { ok: true, balance: wallet.balance };
  }

  const result = await spendTokensLedger(userId, amount, reason, ctx?.source);

  if (!result.ok) {
    await logAdminEvent({
      level: "warn",
      type: "token_spend",
      message: "Недостаточно токенов",
      sessionId: ctx?.sessionId,
      userId,
      meta: { reason, amount, balance: result.balance },
    });
    return result;
  }

  await logAdminEvent({
    level: "info",
    type: "token_spend",
    message: "Списание токенов",
    sessionId: ctx?.sessionId,
    userId,
    meta: { reason, amount, balanceAfter: result.balance },
  });

  return result;
}

/**
 * Возврат токенов (REFUND в ledger).
 */
export async function creditTokens(
  userId: string,
  amount: number,
  reason: string,
  ctx?: { sessionId?: string; source?: string },
): Promise<{ ok: boolean; balance: number }> {
  if (amount <= 0) {
    const wallet = await getWalletSnapshot(userId);
    return { ok: true, balance: wallet.balance };
  }

  try {
    const balance = await refundTokens(userId, amount, reason, ctx?.source);
    void logAdminEvent({
      level: "info",
      type: "token_spend",
      message: "Начисление токенов (возврат)",
      sessionId: ctx?.sessionId,
      userId,
      meta: { reason, amount, balanceAfter: balance },
    });
    return { ok: true, balance };
  } catch (e) {
    console.warn("[token-wallet] credit failed", e instanceof Error ? e.message : e);
    const wallet = await getWalletSnapshot(userId);
    return { ok: false, balance: wallet.balance };
  }
}

export async function getTokenBalanceForUser(userId: string): Promise<number> {
  await ensureBillingForUser(userId);
  const wallet = await getWalletSnapshot(userId);
  return wallet.balance;
}

/**
 * Выполнить действие и списать токены только после успеха.
 */
export async function withTokenSpendAfterSuccess<T>(
  userId: string,
  amount: number,
  reason: string,
  fn: () => Promise<T>,
  ctx?: { sessionId?: string; source?: string },
): Promise<
  | { ok: true; result: T; balance: number }
  | { ok: false; error: "insufficient_tokens"; balance: number }
  | { ok: false; error: "action_failed"; balance: number }
> {
  const check = await checkTokenBalance(userId, amount);
  if (!check.ok) {
    return { ok: false, error: "insufficient_tokens", balance: check.balance };
  }

  try {
    const result = await fn();
    const spend = await spendTokens(userId, amount, reason, ctx);
    if (!spend.ok) {
      return { ok: false, error: "insufficient_tokens", balance: spend.balance };
    }
    return { ok: true, result, balance: spend.balance };
  } catch {
    const wallet = await getWalletSnapshot(userId);
    return { ok: false, error: "action_failed", balance: wallet.balance };
  }
}

// Re-export session helpers from legacy module path
export { ensureSessionUser, getTokenBalance } from "@/lib/session-user";
