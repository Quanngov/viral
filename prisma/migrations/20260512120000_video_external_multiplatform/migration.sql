-- Redefine Video: externalId + multi-platform, drop youtubeVideoId
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

DELETE FROM "SearchCache";

CREATE TABLE "new_Video" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL DEFAULT 'youtube',
    "externalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "videoUrl" TEXT,
    "publishedAt" DATETIME NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT,
    "region" TEXT,
    "sourceQuery" TEXT,
    "niche" TEXT,
    "ageHours" REAL NOT NULL DEFAULT 0,
    "relevanceScore" REAL NOT NULL DEFAULT 0,
    "rawScore" REAL NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 1,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "viralScore" REAL NOT NULL DEFAULT 0,
    "viewsPerHour" REAL NOT NULL DEFAULT 0,
    "engagementRate" REAL NOT NULL DEFAULT 0,
    "channelId" TEXT,
    "channelTitle" TEXT,
    "authorUsername" TEXT,
    "authorDisplayName" TEXT,
    "authorAvatarUrl" TEXT,
    "subtitlesUrl" TEXT,
    "followerCount" INTEGER,
    "retentionRate" REAL,
    "usefulRaw" TEXT,
    "cacheUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastFetchedAt" DATETIME
);

INSERT INTO "new_Video" (
    "id", "platform", "externalId", "url", "title", "description", "thumbnailUrl", "videoUrl",
    "publishedAt", "durationSeconds", "views", "likes", "comments", "shares",
    "language", "region", "sourceQuery", "niche", "ageHours", "relevanceScore", "rawScore",
    "score", "rating", "viralScore", "viewsPerHour", "engagementRate",
    "channelId", "channelTitle", "authorUsername", "authorDisplayName", "authorAvatarUrl",
    "subtitlesUrl", "followerCount", "retentionRate", "usefulRaw", "cacheUrl",
    "createdAt", "updatedAt", "lastFetchedAt"
)
SELECT
    "id",
    "platform",
    "youtubeVideoId",
    "url",
    "title",
    "description",
    "thumbnailUrl",
    NULL,
    "publishedAt",
    "durationSeconds",
    "views",
    "likes",
    "comments",
    0,
    "language",
    "region",
    "sourceQuery",
    "niche",
    "ageHours",
    "relevanceScore",
    "rawScore",
    "score",
    "score",
    "viralScore",
    "viewsPerHour",
    "engagementRate",
    "channelId",
    "channelTitle",
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    "createdAt",
    "updatedAt",
    "lastFetchedAt"
FROM "Video";

DROP TABLE "Video";
ALTER TABLE "new_Video" RENAME TO "Video";

CREATE UNIQUE INDEX "Video_platform_externalId_key" ON "Video"("platform", "externalId");
CREATE INDEX "Video_sourceQuery_idx" ON "Video"("sourceQuery");
CREATE INDEX "Video_platform_idx" ON "Video"("platform");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
