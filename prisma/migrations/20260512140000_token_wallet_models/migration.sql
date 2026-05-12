-- CreateTable
CREATE TABLE "SessionUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "SessionUser_sessionKey_key" ON "SessionUser"("sessionKey");

CREATE TABLE "UserTokenBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 12400,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserTokenBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SessionUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserTokenBalance_userId_key" ON "UserTokenBalance"("userId");

CREATE TABLE "TokenTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SessionUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TokenTransaction_userId_idx" ON "TokenTransaction"("userId");
