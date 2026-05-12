-- CreateTable
CREATE TABLE "SavedVideo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "videoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "authorUsername" TEXT,
    "authorDisplayName" TEXT,
    "authorAvatarUrl" TEXT,
    "views" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "rating" INTEGER,
    "publishedAt" DATETIME,
    "durationSeconds" INTEGER,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedVideo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SessionUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SavedVideo_userId_platform_externalId_key" ON "SavedVideo"("userId", "platform", "externalId");
CREATE INDEX "SavedVideo_userId_createdAt_idx" ON "SavedVideo"("userId", "createdAt");
