-- Per-user competitors, daily sync ledger, CompetitorVideo unique per competitor.
-- Runs after existing migrations; clears competitor data (cannot infer userId for legacy rows).

PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS "CompetitorDailySync";
DROP TABLE IF EXISTS "CompetitorVideo";
DROP TABLE IF EXISTS "CompetitorAccount";

CREATE TABLE "CompetitorAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "username" TEXT,
    "handle" TEXT,
    "displayName" TEXT,
    "profileUrl" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "description" TEXT,
    "uploadsPlaylistId" TEXT,
    "lastReelsPaginationToken" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompetitorAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SessionUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CompetitorAccount_userId_platform_externalId_key" ON "CompetitorAccount"("userId", "platform", "externalId");
CREATE INDEX "CompetitorAccount_userId_idx" ON "CompetitorAccount"("userId");

CREATE TABLE "CompetitorVideo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitorId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "publishedAt" DATETIME NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 1,
    "viralScore" REAL NOT NULL DEFAULT 0,
    "viewsPerHour" REAL NOT NULL DEFAULT 0,
    "engagementRate" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastFetchedAt" DATETIME,
    CONSTRAINT "CompetitorVideo_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "CompetitorAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CompetitorVideo_competitorId_platform_externalId_key" ON "CompetitorVideo"("competitorId", "platform", "externalId");

CREATE TABLE "CompetitorDailySync" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "syncDate" TEXT NOT NULL,
    "chargedTokens" INTEGER NOT NULL,
    "chargedAt" DATETIME NOT NULL,
    "syncedAt" DATETIME,
    "status" TEXT NOT NULL,
    "error" TEXT,
    CONSTRAINT "CompetitorDailySync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SessionUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompetitorDailySync_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "CompetitorAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CompetitorDailySync_userId_competitorId_syncDate_key" ON "CompetitorDailySync"("userId", "competitorId", "syncDate");
CREATE INDEX "CompetitorDailySync_userId_syncDate_idx" ON "CompetitorDailySync"("userId", "syncDate");

PRAGMA foreign_keys=ON;
