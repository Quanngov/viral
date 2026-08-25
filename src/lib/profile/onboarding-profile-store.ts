import "server-only";

import { prisma } from "@/lib/prisma";

export type OnboardingProfileRow = {
  instagramUsername: string;
  tiktokUsername: string;
  youtubeChannel: string;
  creatorType: string;
  contentNiches: string[];
};

function serializeRow(row: {
  instagramUsername: string;
  tiktokUsername: string;
  youtubeChannel: string;
  creatorType: string;
  contentNiches: string[];
}): OnboardingProfileRow {
  return {
    instagramUsername: row.instagramUsername ?? "",
    tiktokUsername: row.tiktokUsername ?? "",
    youtubeChannel: row.youtubeChannel ?? "",
    creatorType: row.creatorType ?? "",
    contentNiches: row.contentNiches ?? [],
  };
}

export async function ensureOnboardingProfile(userId: string): Promise<OnboardingProfileRow> {
  // Read-first: a plain findUnique is a cheaper single round-trip than an upsert
  // (which always writes) for the common case where the profile already exists.
  const existing = await prisma.userOnboardingProfile.findUnique({ where: { userId } });
  if (existing) return serializeRow(existing);

  const created = await prisma.userOnboardingProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  return serializeRow(created);
}

export async function patchOnboardingProfile(
  userId: string,
  patch: Partial<OnboardingProfileRow>,
): Promise<void> {
  await prisma.userOnboardingProfile.upsert({
    where: { userId },
    create: { userId, ...patch },
    update: patch,
  });
}
