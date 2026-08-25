-- Social Sync Engine: queue, snapshots, webhooks, sync metadata

ALTER TABLE "UserSocialAccount" ADD COLUMN IF NOT EXISTS "videoCount" INTEGER;
ALTER TABLE "UserSocialAccount" ADD COLUMN IF NOT EXISTS "monthlyViews" INTEGER;
ALTER TABLE "UserSocialAccount" ADD COLUMN IF NOT EXISTS "connectionHealth" TEXT NOT NULL DEFAULT 'disconnected';
ALTER TABLE "UserSocialAccount" ADD COLUMN IF NOT EXISTS "syncStatus" TEXT NOT NULL DEFAULT 'idle';
ALTER TABLE "UserSocialAccount" ADD COLUMN IF NOT EXISTS "updateStrategy" TEXT NOT NULL DEFAULT 'polling';
ALTER TABLE "UserSocialAccount" ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3);
ALTER TABLE "UserSocialAccount" ADD COLUMN IF NOT EXISTS "lastSyncSuccessAt" TIMESTAMP(3);
ALTER TABLE "UserSocialAccount" ADD COLUMN IF NOT EXISTS "lastSyncFailedAt" TIMESTAMP(3);
ALTER TABLE "UserSocialAccount" ADD COLUMN IF NOT EXISTS "nextSyncAt" TIMESTAMP(3);
ALTER TABLE "UserSocialAccount" ADD COLUMN IF NOT EXISTS "lastSyncError" TEXT NOT NULL DEFAULT '';
ALTER TABLE "UserSocialAccount" ADD COLUMN IF NOT EXISTS "manualRefreshAt" TIMESTAMP(3);

ALTER TABLE "UserSocialOAuthCredential" ADD COLUMN IF NOT EXISTS "lastValidatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "UserSocialAccount_syncStatus_nextSyncAt_idx" ON "UserSocialAccount"("syncStatus", "nextSyncAt");
CREATE INDEX IF NOT EXISTS "UserSocialAccount_platform_connectionStatus_idx" ON "UserSocialAccount"("platform", "connectionStatus");

CREATE TABLE IF NOT EXISTS "SocialSyncJob" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT NOT NULL DEFAULT '',
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialSyncJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SocialSyncLog" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialSyncLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SocialAccountSnapshot" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followers" INTEGER,
    "totalLikes" INTEGER,
    "avgViews" INTEGER,
    "avgEngagement" DOUBLE PRECISION,
    "videoCount" INTEGER,
    "monthlyViews" INTEGER,
    "totalComments" INTEGER,
    "engagementRate" DOUBLE PRECISION,
    "rawJson" JSONB,

    CONSTRAINT "SocialAccountSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SocialWebhookSubscription" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalSubId" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "callbackUrl" TEXT NOT NULL DEFAULT '',
    "subscribedTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastEventAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialWebhookSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SocialWebhookEvent" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "eventType" TEXT NOT NULL DEFAULT '',
    "externalEventId" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payloadJson" JSONB,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "retryAfter" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SocialWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SocialWebhookSubscription_socialAccountId_key" ON "SocialWebhookSubscription"("socialAccountId");
CREATE INDEX IF NOT EXISTS "SocialSyncJob_status_scheduledFor_priority_idx" ON "SocialSyncJob"("status", "scheduledFor", "priority");
CREATE INDEX IF NOT EXISTS "SocialSyncJob_socialAccountId_createdAt_idx" ON "SocialSyncJob"("socialAccountId", "createdAt");
CREATE INDEX IF NOT EXISTS "SocialSyncLog_socialAccountId_createdAt_idx" ON "SocialSyncLog"("socialAccountId", "createdAt");
CREATE INDEX IF NOT EXISTS "SocialSyncLog_platform_createdAt_idx" ON "SocialSyncLog"("platform", "createdAt");
CREATE INDEX IF NOT EXISTS "SocialSyncLog_level_createdAt_idx" ON "SocialSyncLog"("level", "createdAt");
CREATE INDEX IF NOT EXISTS "SocialAccountSnapshot_socialAccountId_capturedAt_idx" ON "SocialAccountSnapshot"("socialAccountId", "capturedAt");
CREATE INDEX IF NOT EXISTS "SocialWebhookSubscription_platform_status_idx" ON "SocialWebhookSubscription"("platform", "status");
CREATE INDEX IF NOT EXISTS "SocialWebhookEvent_status_retryAfter_idx" ON "SocialWebhookEvent"("status", "retryAfter");
CREATE INDEX IF NOT EXISTS "SocialWebhookEvent_subscriptionId_receivedAt_idx" ON "SocialWebhookEvent"("subscriptionId", "receivedAt");
CREATE INDEX IF NOT EXISTS "SocialWebhookEvent_platform_receivedAt_idx" ON "SocialWebhookEvent"("platform", "receivedAt");

DO $$ BEGIN
  ALTER TABLE "SocialSyncJob" ADD CONSTRAINT "SocialSyncJob_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "UserSocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "SocialSyncLog" ADD CONSTRAINT "SocialSyncLog_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "UserSocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "SocialAccountSnapshot" ADD CONSTRAINT "SocialAccountSnapshot_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "UserSocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "SocialWebhookSubscription" ADD CONSTRAINT "SocialWebhookSubscription_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "UserSocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "SocialWebhookEvent" ADD CONSTRAINT "SocialWebhookEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "SocialWebhookSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

UPDATE "UserSocialAccount"
SET "connectionHealth" = 'healthy', "nextSyncAt" = NOW() + INTERVAL '4 hours'
WHERE trim("username") <> '' AND "connectionStatus" = 'connected';
