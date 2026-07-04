-- User onboarding profile (social accounts, creator type, niches)

CREATE TABLE "UserOnboardingProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instagramUsername" TEXT NOT NULL DEFAULT '',
    "tiktokUsername" TEXT NOT NULL DEFAULT '',
    "youtubeChannel" TEXT NOT NULL DEFAULT '',
    "creatorType" TEXT NOT NULL DEFAULT '',
    "contentNiches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "referenceLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "onboardingDoneAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOnboardingProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserOnboardingProfile_userId_key" ON "UserOnboardingProfile"("userId");
CREATE INDEX "UserOnboardingProfile_userId_idx" ON "UserOnboardingProfile"("userId");

ALTER TABLE "UserOnboardingProfile" ADD CONSTRAINT "UserOnboardingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SessionUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
