import "server-only";

import {
  BILLING_PLANS,
  getMaxCompetitorsForPlan,
  getSubscriptionGrantTokens,
  TOKEN_PACKS,
  type BillingInterval,
  type BillingPlanId,
  type TokenLedgerType,
  type TokenPackId,
} from "@/lib/billing/billing.config";
import { prisma } from "@/lib/prisma";

type BillingTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const VALID_PLANS = new Set<string>(["FREE", "TRIAL", "PRO", "BUSINESS"]);

export function isBillingPlanId(v: string): v is BillingPlanId {
  return VALID_PLANS.has(v);
}

export type BillingSnapshot = {
  plan: BillingPlanId;
  status: string;
  billingInterval: BillingInterval | null;
  startedAt: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  renewsAt: string | null;
  trialEndsAt: string | null;
  cancelledAt: string | null;
  maxCompetitors: number;
  nextGrantAt: string | null;
};

export type WalletSnapshot = {
  balance: number;
  totalSpent: number;
  totalGranted: number;
  lastGrantedAt: string | null;
};

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function addMonths(d: Date, months: number): Date {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + months);
  return x;
}

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

async function getSessionAuthUserId(userId: string, tx?: BillingTx): Promise<string | null> {
  const db = tx ?? prisma;
  const row = await db.sessionUser.findUnique({
    where: { id: userId },
    select: { authUserId: true },
  });
  return row?.authUserId ?? null;
}

/** Заявка grant на auth user; false если уже был (в т.ч. гонка). */
async function tryClaimAuthGrant(
  tx: BillingTx,
  authUserId: string,
  grantType: string,
  sessionUserId: string,
): Promise<boolean> {
  const existing = await tx.authBillingGrant.findUnique({
    where: { authUserId_grantType: { authUserId, grantType } },
  });
  if (existing) return false;

  try {
    await tx.authBillingGrant.create({
      data: { authUserId, grantType, sessionUserId },
    });
    return true;
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") return false;
    throw e;
  }
}

async function expireSubscriptionIfNeeded(userId: string, tx?: BillingTx): Promise<void> {
  const db = tx ?? prisma;
  const sub = await db.userSubscription.findUnique({ where: { userId } });
  if (!sub) return;
  const now = new Date();
  if (sub.status === "TRIAL" && sub.trialEndsAt && sub.trialEndsAt < now) {
    await db.userSubscription.update({
      where: { userId },
      data: { plan: "FREE", status: "EXPIRED" },
    });
    return;
  }
  if (
    (sub.plan === "PRO" || sub.plan === "BUSINESS") &&
    sub.currentPeriodEnd &&
    sub.currentPeriodEnd < now
  ) {
    await db.userSubscription.update({
      where: { userId },
      data: { plan: "FREE", status: "EXPIRED", billingInterval: null },
    });
  }
}
function subscriptionToSnapshot(row: {
  plan: string;
  status: string;
  billingInterval: string | null;
  startedAt: Date;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  renewsAt: Date | null;
  trialEndsAt: Date | null;
  cancelledAt: Date | null;
}): BillingSnapshot {
  const plan = isBillingPlanId(row.plan) ? row.plan : "FREE";
  return {
    plan,
    status: row.status,
    billingInterval:
      row.billingInterval === "MONTHLY" || row.billingInterval === "YEARLY"
        ? row.billingInterval
        : null,
    startedAt: row.startedAt.toISOString(),
    currentPeriodStart: toIso(row.currentPeriodStart),
    currentPeriodEnd: toIso(row.currentPeriodEnd),
    renewsAt: toIso(row.renewsAt),
    trialEndsAt: toIso(row.trialEndsAt),
    cancelledAt: toIso(row.cancelledAt),
    maxCompetitors: getMaxCompetitorsForPlan(plan),
    nextGrantAt: toIso(row.renewsAt ?? row.currentPeriodEnd),
  };
}

/** Создаёт подписку FREE + кошелёк + разовое начисление 60 tok для нового пользователя. */
export async function ensureBillingForUser(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    let sub = await tx.userSubscription.findUnique({ where: { userId } });
    if (!sub) {
      sub = await tx.userSubscription.create({
        data: {
          userId,
          plan: "FREE",
          status: "ACTIVE",
        },
      });
    }

    let wallet = await tx.userTokenBalance.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await tx.userTokenBalance.create({
        data: { userId, balance: 0, totalSpent: 0, totalGranted: 0 },
      });
    }

    const authUserId = await getSessionAuthUserId(userId, tx);
    if (authUserId && sub.plan === "FREE") {
      const claimed = await tryClaimAuthGrant(tx, authUserId, "FREE_GRANT", userId);
      if (claimed) {
        await grantTokensInTx(tx, userId, BILLING_PLANS.FREE.initialGrantTokens, {
          type: "FREE_GRANT",
          reason: "free_signup",
          source: "FREE",
        });
      }
    }
  });
}

async function grantTokensInTx(
  tx: BillingTx,
  userId: string,
  amount: number,
  meta: { type: TokenLedgerType; reason: string; source?: string; metaJson?: string },
): Promise<number> {
  if (amount <= 0) {
    const row = await tx.userTokenBalance.findUnique({ where: { userId } });
    return row?.balance ?? 0;
  }

  await tx.userTokenBalance.upsert({
    where: { userId },
    create: { userId, balance: 0, totalSpent: 0, totalGranted: 0 },
    update: {},
  });

  const before = await tx.userTokenBalance.findUniqueOrThrow({
    where: { userId },
    select: { balance: true },
  });
  const afterBalance = before.balance + amount;

  await tx.userTokenBalance.update({
    where: { userId },
    data: {
      balance: afterBalance,
      totalGranted: { increment: amount },
      lastGrantedAt: new Date(),
    },
  });

  await tx.tokenTransaction.create({
    data: {
      userId,
      type: meta.type,
      amount,
      balanceBefore: before.balance,
      balanceAfter: afterBalance,
      reason: meta.reason,
      source: meta.source ?? null,
      metaJson: meta.metaJson ?? null,
    },
  });

  return afterBalance;
}

export async function grantTokens(
  userId: string,
  amount: number,
  meta: { type: TokenLedgerType; reason: string; source?: string; metaJson?: string },
): Promise<number> {
  return prisma.$transaction((tx) => grantTokensInTx(tx, userId, amount, meta));
}

async function spendTokensInTx(
  tx: BillingTx,
  userId: string,
  amount: number,
  reason: string,
  source?: string,
): Promise<{ ok: true; balance: number } | { ok: false; balance: number }> {
  if (amount <= 0) {
    const row = await tx.userTokenBalance.findUnique({ where: { userId } });
    return { ok: true, balance: row?.balance ?? 0 };
  }

  await tx.userTokenBalance.upsert({
    where: { userId },
    create: { userId, balance: 0, totalSpent: 0, totalGranted: 0 },
    update: {},
  });

  const beforeRow = await tx.userTokenBalance.findUniqueOrThrow({
    where: { userId },
    select: { balance: true },
  });

  const updated = await tx.userTokenBalance.updateMany({
    where: { userId, balance: { gte: amount } },
    data: {
      balance: { decrement: amount },
      totalSpent: { increment: amount },
    },
  });

  if (updated.count === 0) {
    const row = await tx.userTokenBalance.findUnique({
      where: { userId },
      select: { balance: true },
    });
    return { ok: false, balance: row?.balance ?? 0 };
  }

  const afterRow = await tx.userTokenBalance.findUniqueOrThrow({
    where: { userId },
    select: { balance: true },
  });

  await tx.tokenTransaction.create({
    data: {
      userId,
      type: "SPEND",
      amount: -amount,
      balanceBefore: beforeRow.balance,
      balanceAfter: afterRow.balance,
      reason,
      source: source ?? null,
    },
  });

  return { ok: true, balance: afterRow.balance };
}

export async function spendTokensLedger(
  userId: string,
  amount: number,
  reason: string,
  source?: string,
): Promise<{ ok: boolean; balance: number }> {
  try {
    const result = await prisma.$transaction((tx) =>
      spendTokensInTx(tx, userId, amount, reason, source),
    );
    return result;
  } catch {
    const row = await prisma.userTokenBalance.findUnique({
      where: { userId },
      select: { balance: true },
    });
    return { ok: false, balance: row?.balance ?? 0 };
  }
}

export async function refundTokens(
  userId: string,
  amount: number,
  reason: string,
  source?: string,
): Promise<number> {
  return grantTokens(userId, amount, { type: "REFUND", reason, source });
}

export async function getWalletSnapshot(
  userId: string,
  opts?: { skipEnsureBilling?: boolean },
): Promise<WalletSnapshot> {
  if (!opts?.skipEnsureBilling) {
    await ensureBillingForUser(userId);
  }
  const row = await prisma.userTokenBalance.findUnique({
    where: { userId },
    select: { balance: true, totalSpent: true, totalGranted: true, lastGrantedAt: true },
  });
  return {
    balance: row?.balance ?? 0,
    totalSpent: row?.totalSpent ?? 0,
    totalGranted: row?.totalGranted ?? 0,
    lastGrantedAt: toIso(row?.lastGrantedAt),
  };
}

export async function getSubscriptionSnapshot(userId: string): Promise<BillingSnapshot> {
  await ensureBillingForUser(userId);
  await expireSubscriptionIfNeeded(userId);
  const row = await prisma.userSubscription.findUniqueOrThrow({ where: { userId } });
  return subscriptionToSnapshot(row);
}

export async function getMaxCompetitorsForUser(userId: string): Promise<number> {
  await expireSubscriptionIfNeeded(userId);
  const sub = await getSubscriptionSnapshot(userId);
  return sub.maxCompetitors;
}

/** Блокировка SessionUser + проверка лимита конкурентов (защита от race). */
export async function assertCompetitorAddAllowed(args: {
  userId: string;
  platform: string;
  externalId: string;
}): Promise<
  | { ok: true; alreadyMine: boolean }
  | { ok: false; error: "limit_reached" | "insufficient_tokens"; message: string; status: number; balance?: number }
> {
  await expireSubscriptionIfNeeded(args.userId);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM "SessionUser" WHERE id = ${args.userId} FOR UPDATE`;
    await expireSubscriptionIfNeeded(args.userId, tx);
    const existing = await tx.competitorAccount.findFirst({
      where: { userId: args.userId, platform: args.platform, externalId: args.externalId },
    });
    if (existing) return { ok: true as const, alreadyMine: true };
    const sub = await tx.userSubscription.findUnique({ where: { userId: args.userId } });
    const plan = sub && isBillingPlanId(sub.plan) ? sub.plan : "FREE";
    const max = getMaxCompetitorsForPlan(plan);
    const count = await tx.competitorAccount.count({ where: { userId: args.userId } });
    if (count >= max) {
      return {
        ok: false as const,
        error: "limit_reached" as const,
        message: `Достигнут лимит конкурентов для вашего тарифа (${max}).`,
        status: 409,
      };
    }
    return { ok: true as const, alreadyMine: false };
  });
}

export async function hasSufficientBalance(userId: string, amount: number): Promise<boolean> {
  const wallet = await getWalletSnapshot(userId);
  return wallet.balance >= amount;
}

/** Активация пробного периода (один раз на auth user). */
export async function activateTrial(userId: string): Promise<{ ok: boolean; error?: string }> {
  const authUserId = await getSessionAuthUserId(userId);
  if (!authUserId) {
    return { ok: false, error: "auth_required" };
  }

  const now = new Date();
  const trialEnds = addDays(now, BILLING_PLANS.TRIAL.trialDays ?? 3);

  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tryClaimAuthGrant(tx, authUserId, "TRIAL_GRANT", userId);
      if (!claimed) {
        throw new Error("trial_already_used");
      }
      await tx.userSubscription.upsert({
        where: { userId },
        create: {
          userId,
          plan: "TRIAL",
          status: "TRIAL",
          startedAt: now,
          trialEndsAt: trialEnds,
          currentPeriodStart: now,
          currentPeriodEnd: trialEnds,
        },
        update: {
          plan: "TRIAL",
          status: "TRIAL",
          trialEndsAt: trialEnds,
          currentPeriodStart: now,
          currentPeriodEnd: trialEnds,
          cancelledAt: null,
        },
      });
      await grantTokensInTx(tx, userId, BILLING_PLANS.TRIAL.initialGrantTokens, {
        type: "TRIAL_GRANT",
        reason: "trial_activation",
        source: "TRIAL",
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "trial_already_used") {
      return { ok: false, error: "trial_already_used" };
    }
    throw e;
  }

  return { ok: true };
}

/** Продление подписки после оплаты заказа. */
export async function activatePaidSubscription(args: {
  userId: string;
  plan: "PRO" | "BUSINESS";
  interval: BillingInterval;
  orderId: string;
}): Promise<void> {
  const now = new Date();
  const periodEnd = args.interval === "YEARLY" ? addMonths(now, 12) : addMonths(now, 1);
  const tokens = getSubscriptionGrantTokens(args.plan);

  await prisma.$transaction(async (tx) => {
    await tx.userSubscription.upsert({
      where: { userId: args.userId },
      create: {
        userId: args.userId,
        plan: args.plan,
        status: "ACTIVE",
        billingInterval: args.interval,
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        renewsAt: periodEnd,
      },
      update: {
        plan: args.plan,
        status: "ACTIVE",
        billingInterval: args.interval,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        renewsAt: periodEnd,
        trialEndsAt: null,
        cancelledAt: null,
      },
    });

    await grantTokensInTx(tx, args.userId, tokens, {
      type: "SUBSCRIPTION_GRANT",
      reason: "subscription_renewal",
      source: args.orderId,
      metaJson: JSON.stringify({ plan: args.plan, interval: args.interval }),
    });
  });
}

export async function grantTokenPack(args: {
  userId: string;
  packId: TokenPackId;
  orderId: string;
}): Promise<number> {
  const pack = TOKEN_PACKS[args.packId];
  return grantTokens(args.userId, pack.tokens, {
    type: "TOKEN_PACK",
    reason: "token_pack_purchase",
    source: args.orderId,
    metaJson: JSON.stringify({ packId: args.packId }),
  });
}

export async function createBillingOrder(args: {
  userId: string;
  kind: "SUBSCRIPTION" | "TOKEN_PACK";
  productId: string;
  billingInterval?: BillingInterval;
}): Promise<{ orderId: string; amountRub: number; tokensGrant: number }> {
  let amountRub = 0;
  let tokensGrant = 0;

  if (args.kind === "TOKEN_PACK") {
    const pack = TOKEN_PACKS[args.productId as TokenPackId];
    if (!pack) throw new Error("invalid_token_pack");
    amountRub = pack.priceRub;
    tokensGrant = pack.tokens;
  } else if (args.kind === "SUBSCRIPTION") {
    const plan = BILLING_PLANS[args.productId as BillingPlanId];
    if (!plan || (args.productId !== "PRO" && args.productId !== "BUSINESS")) {
      throw new Error("invalid_subscription_plan");
    }
    const interval = args.billingInterval ?? "MONTHLY";
    amountRub = interval === "YEARLY" ? plan.priceYearlyRub : plan.priceMonthlyRub;
    tokensGrant = plan.tokensPerPeriod;
  } else {
    throw new Error("invalid_order_kind");
  }

  const order = await prisma.billingOrder.create({
    data: {
      userId: args.userId,
      kind: args.kind,
      productId: args.productId,
      billingInterval: args.billingInterval ?? null,
      amountRub,
      tokensGrant,
      status: "PENDING",
    },
  });

  return { orderId: order.id, amountRub, tokensGrant };
}

export async function confirmBillingOrder(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.billingOrder.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "PAID", paidAt: now },
    });

    if (updated.count === 0) {
      const order = await tx.billingOrder.findUnique({ where: { id: orderId } });
      if (!order) return { ok: false, error: "not_found" };
      if (order.status === "PAID") return { ok: true };
      return { ok: false, error: "invalid_status" };
    }

    const order = await tx.billingOrder.findUniqueOrThrow({ where: { id: orderId } });

    if (order.kind === "TOKEN_PACK") {
      const pack = TOKEN_PACKS[order.productId as TokenPackId];
      await grantTokensInTx(tx, order.userId, pack.tokens, {
        type: "TOKEN_PACK",
        reason: "token_pack_purchase",
        source: order.id,
        metaJson: JSON.stringify({ packId: order.productId }),
      });
    } else if (order.kind === "SUBSCRIPTION") {
      const interval =
        order.billingInterval === "YEARLY" || order.billingInterval === "MONTHLY"
          ? order.billingInterval
          : "MONTHLY";
      const plan = order.productId as "PRO" | "BUSINESS";
      const periodEnd = interval === "YEARLY" ? addMonths(now, 12) : addMonths(now, 1);
      const tokens = getSubscriptionGrantTokens(plan);

      await tx.userSubscription.upsert({
        where: { userId: order.userId },
        create: {
          userId: order.userId,
          plan,
          status: "ACTIVE",
          billingInterval: interval,
          startedAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          renewsAt: periodEnd,
        },
        update: {
          plan,
          status: "ACTIVE",
          billingInterval: interval,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          renewsAt: periodEnd,
          trialEndsAt: null,
          cancelledAt: null,
        },
      });

      await grantTokensInTx(tx, order.userId, tokens, {
        type: "SUBSCRIPTION_GRANT",
        reason: "subscription_renewal",
        source: order.id,
        metaJson: JSON.stringify({ plan, interval }),
      });
    }

    return { ok: true };
  });
}

export async function getLedgerPage(userId: string, limit = 50, cursor?: string) {
  const rows = await prisma.tokenTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: items.map((r) => ({
      id: r.id,
      type: r.type,
      amount: r.amount,
      balanceBefore: r.balanceBefore,
      balanceAfter: r.balanceAfter,
      reason: r.reason,
      source: r.source,
      createdAt: r.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
  };
}

export async function getAdminBillingStats() {
  const [byPlan, trialUsers, ordersPaid, tokenStats] = await Promise.all([
    prisma.userSubscription.groupBy({
      by: ["plan"],
      _count: { _all: true },
    }),
    prisma.userSubscription.count({ where: { status: "TRIAL" } }),
    prisma.billingOrder.findMany({
      where: { status: "PAID" },
      select: { kind: true, amountRub: true, productId: true, tokensGrant: true },
    }),
    prisma.userTokenBalance.aggregate({
      _sum: { totalSpent: true, totalGranted: true, balance: true },
    }),
  ]);

  let mrr = 0;
  const planCounts: Record<string, number> = {};
  for (const row of byPlan) {
    planCounts[row.plan] = row._count._all;
    if (row.plan === "PRO") mrr += row._count._all * BILLING_PLANS.PRO.priceMonthlyRub;
    if (row.plan === "BUSINESS") mrr += row._count._all * BILLING_PLANS.BUSINESS.priceMonthlyRub;
  }

  const packSales = ordersPaid.filter((o) => o.kind === "TOKEN_PACK");
  const packRevenue = packSales.reduce((s, o) => s + o.amountRub, 0);

  return {
    usersByPlan: planCounts,
    trialUsers,
    mrr,
    arr: mrr * 12,
    packSalesCount: packSales.length,
    packRevenueRub: packRevenue,
    tokensGrantedTotal: tokenStats._sum.totalGranted ?? 0,
    tokensSpentTotal: tokenStats._sum.totalSpent ?? 0,
    tokensBalanceTotal: tokenStats._sum.balance ?? 0,
    paidOrdersCount: ordersPaid.length,
  };
}

export async function adminAdjustBalance(args: {
  userId: string;
  amount: number;
  reason: string;
}): Promise<number> {
  if (args.amount === 0) return (await getWalletSnapshot(args.userId)).balance;
  if (args.amount > 0) {
    return grantTokens(args.userId, args.amount, {
      type: "ADMIN_ADJUSTMENT",
      reason: args.reason,
      source: "admin",
    });
  }
  const spend = await spendTokensLedger(args.userId, -args.amount, args.reason, "admin");
  return spend.balance;
}
