-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Video" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL DEFAULT 'youtube',
    "youtubeVideoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "channelId" TEXT,
    "channelTitle" TEXT,
    "thumbnailUrl" TEXT,
    "publishedAt" DATETIME NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT,
    "region" TEXT,
    "sourceQuery" TEXT,
    "ageHours" REAL NOT NULL DEFAULT 0,
    "relevanceScore" REAL NOT NULL DEFAULT 0,
    "rawScore" REAL NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 1,
    "viralScore" REAL NOT NULL DEFAULT 0,
    "viewsPerHour" REAL NOT NULL DEFAULT 0,
    "engagementRate" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastFetchedAt" DATETIME
);
INSERT INTO "new_Video" ("channelId", "channelTitle", "comments", "createdAt", "description", "durationSeconds", "engagementRate", "id", "language", "lastFetchedAt", "likes", "platform", "publishedAt", "region", "sourceQuery", "thumbnailUrl", "title", "updatedAt", "url", "views", "viewsPerHour", "viralScore", "youtubeVideoId") SELECT "channelId", "channelTitle", "comments", "createdAt", "description", "durationSeconds", "engagementRate", "id", "language", "lastFetchedAt", "likes", "platform", "publishedAt", "region", "sourceQuery", "thumbnailUrl", "title", "updatedAt", "url", "views", "viewsPerHour", "viralScore", "youtubeVideoId" FROM "Video";
DROP TABLE "Video";
ALTER TABLE "new_Video" RENAME TO "Video";
CREATE UNIQUE INDEX "Video_youtubeVideoId_key" ON "Video"("youtubeVideoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
