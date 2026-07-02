-- Billing & monetization: subscriptions, ledger, orders

-- UserTokenBalance: extend wallet stats, reset demo default
ALTER TABLE "UserTokenBalance" ADD COLUMN IF NOT EXISTS "totalSpent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserTokenBalance" ADD COLUMN IF NOT EXISTS "totalGranted" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserTokenBalance" ADD COLUMN IF NOT EXISTS "lastGrantedAt" TIMESTAMP(3);

ALTER TABLE "UserTokenBalance" ALTER COLUMN "balance" SET DEFAULT 0;

-- Reset demo balances (12400) to free tier grant
UPDATE "UserTokenBalance" SET "balance" = 60 WHERE "balance" = 12400;

-- TokenTransaction: ledger fields
ALTER TABLE "TokenTransaction" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'SPEND';
ALTER TABLE "TokenTransaction" ADD COLUMN IF NOT EXISTS "balanceBefore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TokenTransaction" ADD COLUMN IF NOT EXISTS "balanceAfter" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TokenTransaction" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "TokenTransaction" ADD COLUMN IF NOT EXISTS "metaJson" TEXT;

CREATE INDEX IF NOT EXISTS "TokenTransaction_userId_createdAt_idx" ON "TokenTransaction"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "TokenTransaction_type_idx" ON "TokenTransaction"("type");

-- UserSubscription
CREATE TABLE IF NOT EXISTS "UserSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "billingInterval" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "renewsAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserSubscription_userId_key" ON "UserSubscription"("userId");
CREATE INDEX IF NOT EXISTS "UserSubscription_plan_idx" ON "UserSubscription"("plan");
CREATE INDEX IF NOT EXISTS "UserSubscription_status_idx" ON "UserSubscription"("status");

ALTER TABLE "UserSubscription" DROP CONSTRAINT IF EXISTS "UserSubscription_userId_fkey";
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SessionUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BillingOrder
CREATE TABLE IF NOT EXISTS "BillingOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "billingInterval" TEXT,
    "amountRub" INTEGER NOT NULL,
    "tokensGrant" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingOrder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BillingOrder_userId_createdAt_idx" ON "BillingOrder"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "BillingOrder_status_idx" ON "BillingOrder"("status");

ALTER TABLE "BillingOrder" DROP CONSTRAINT IF EXISTS "BillingOrder_userId_fkey";
ALTER TABLE "BillingOrder" ADD CONSTRAINT "BillingOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SessionUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed FREE subscriptions for existing users without one
INSERT INTO "UserSubscription" ("id", "userId", "plan", "status", "startedAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, su."id", 'FREE', 'ACTIVE', NOW(), NOW(), NOW()
FROM "SessionUser" su
WHERE NOT EXISTS (SELECT 1 FROM "UserSubscription" us WHERE us."userId" = su."id");
