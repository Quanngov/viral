-- CreateTable
CREATE TABLE "ScriptUserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "occupation" TEXT NOT NULL DEFAULT '',
    "targetAudience" TEXT NOT NULL DEFAULT '',
    "tone" TEXT NOT NULL DEFAULT '',
    "cta" TEXT NOT NULL DEFAULT '',
    "restrictions" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScriptUserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SessionUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ScriptUserProfile_userId_key" ON "ScriptUserProfile"("userId");
CREATE INDEX "ScriptUserProfile_userId_idx" ON "ScriptUserProfile"("userId");

-- CreateTable
CREATE TABLE "ScriptChat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Новый чат',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScriptChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SessionUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ScriptChat_userId_updatedAt_idx" ON "ScriptChat"("userId", "updatedAt");

-- CreateTable
CREATE TABLE "ScriptMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "savedVideoId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScriptMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "ScriptChat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ScriptMessage_chatId_createdAt_idx" ON "ScriptMessage"("chatId", "createdAt");
