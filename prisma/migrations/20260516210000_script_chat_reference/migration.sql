-- CreateTable
CREATE TABLE "ScriptChatReference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "videoId" TEXT,
    "savedVideoId" TEXT,
    "competitorVideoId" TEXT,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "videoUrl" TEXT,
    "url" TEXT NOT NULL,
    "authorUsername" TEXT,
    "authorDisplayName" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER,
    "publishedAt" DATETIME,
    "description" TEXT,
    "transcriptSource" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScriptChatReference_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "ScriptChat" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScriptChatReference_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ScriptChatReference_chatId_platform_externalId_key" ON "ScriptChatReference"("chatId", "platform", "externalId");
CREATE INDEX "ScriptChatReference_chatId_idx" ON "ScriptChatReference"("chatId");
CREATE INDEX "ScriptChatReference_videoId_idx" ON "ScriptChatReference"("videoId");
