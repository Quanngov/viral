-- Поля для транскрибации и синхронизации с общей таблицей Video (Instagram / TikHub).
ALTER TABLE "CompetitorVideo" ADD COLUMN "videoUrl" TEXT;
ALTER TABLE "CompetitorVideo" ADD COLUMN "subtitlesUrl" TEXT;
ALTER TABLE "CompetitorVideo" ADD COLUMN "usefulRaw" TEXT;
ALTER TABLE "CompetitorVideo" ADD COLUMN "shares" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CompetitorVideo" ADD COLUMN "authorUsername" TEXT;
ALTER TABLE "CompetitorVideo" ADD COLUMN "authorDisplayName" TEXT;
ALTER TABLE "CompetitorVideo" ADD COLUMN "authorAvatarUrl" TEXT;
