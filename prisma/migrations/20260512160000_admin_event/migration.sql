-- CreateTable
CREATE TABLE "AdminEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "metaJson" TEXT
);

CREATE INDEX "AdminEvent_createdAt_idx" ON "AdminEvent"("createdAt");
CREATE INDEX "AdminEvent_level_idx" ON "AdminEvent"("level");
CREATE INDEX "AdminEvent_type_idx" ON "AdminEvent"("type");
