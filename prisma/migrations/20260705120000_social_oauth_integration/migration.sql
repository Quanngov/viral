-- Social OAuth integration + metric snapshots for trend arrows
ALTER TABLE "UserSocialAccount" ADD COLUMN IF NOT EXISTS "followersPrev" INTEGER;
ALTER TABLE "UserSocialAccount" ADD COLUMN IF NOT EXISTS "avgViewsPrev" INTEGER;
ALTER TABLE "UserSocialAccount" ADD COLUMN IF NOT EXISTS "authMethod" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "UserSocialAccount" ADD COLUMN IF NOT EXISTS "connectionStatus" TEXT NOT NULL DEFAULT 'disconnected';
ALTER TABLE "UserSocialAccount" ADD COLUMN IF NOT EXISTS "externalAccountId" TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "UserSocialOAuthCredential" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL DEFAULT '',
    "refreshToken" TEXT NOT NULL DEFAULT '',
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "providerUserId" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSocialOAuthCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserSocialOAuthCredential_socialAccountId_key" ON "UserSocialOAuthCredential"("socialAccountId");

DO $$ BEGIN
  ALTER TABLE "UserSocialOAuthCredential" ADD CONSTRAINT "UserSocialOAuthCredential_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "UserSocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

UPDATE "UserSocialAccount"
SET "connectionStatus" = 'connected'
WHERE trim("username") <> '' AND "connectionStatus" = 'disconnected';
