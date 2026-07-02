CREATE TABLE IF NOT EXISTS "AuthBillingGrant" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "grantType" TEXT NOT NULL,
    "sessionUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthBillingGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthBillingGrant_authUserId_grantType_key" ON "AuthBillingGrant"("authUserId", "grantType");
CREATE INDEX IF NOT EXISTS "AuthBillingGrant_authUserId_idx" ON "AuthBillingGrant"("authUserId");
