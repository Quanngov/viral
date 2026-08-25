-- Profile Hub: social accounts + AI analysis jobs

CREATE TABLE "UserSocialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT '',
    "avatarUrl" TEXT NOT NULL DEFAULT '',
    "profileUrl" TEXT NOT NULL DEFAULT '',
    "followers" INTEGER,
    "totalLikes" INTEGER,
    "avgViews" INTEGER,
    "avgEngagement" DOUBLE PRECISION,
    "postingFreq" TEXT NOT NULL DEFAULT '',
    "lastUploadAt" TIMESTAMP(3),
    "growthPercent" DOUBLE PRECISION,
    "bestVideoJson" JSONB,
    "statsSource" TEXT NOT NULL DEFAULT 'pending',
    "statsUpdatedAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSocialAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserProfileAiAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tokenCost" INTEGER NOT NULL DEFAULT 500,
    "reportJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "UserProfileAiAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSocialAccount_userId_platform_key" ON "UserSocialAccount"("userId", "platform");
CREATE INDEX "UserSocialAccount_userId_idx" ON "UserSocialAccount"("userId");
CREATE INDEX "UserProfileAiAnalysis_userId_createdAt_idx" ON "UserProfileAiAnalysis"("userId", "createdAt");

ALTER TABLE "UserSocialAccount" ADD CONSTRAINT "UserSocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SessionUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserProfileAiAnalysis" ADD CONSTRAINT "UserProfileAiAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SessionUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
