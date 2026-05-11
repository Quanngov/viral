import type { CompetitorAccount, CompetitorVideo } from "@/lib/competitor-mock-data";

type StoreData = {
  competitors: CompetitorAccount[];
  videos: CompetitorVideo[];
};

declare global {
  var __competitorStore: StoreData | undefined;
}

function getStore(): StoreData {
  if (!globalThis.__competitorStore) {
    globalThis.__competitorStore = {
      competitors: [],
      videos: [],
    };
  }
  return globalThis.__competitorStore;
}

export function listCompetitors(): CompetitorAccount[] {
  return getStore().competitors;
}

export function createCompetitor(input: {
  username: string;
  platform?: CompetitorAccount["platform"];
  profileUrl?: string;
  avatarUrl?: string;
  displayName?: string;
  description?: string;
}): CompetitorAccount {
  const store = getStore();
  const now = new Date().toISOString();
  const platform = input.platform ?? "instagram";
  const profileUrl =
    input.profileUrl ??
    (platform === "instagram"
      ? `https://instagram.com/${input.username}`
      : platform === "youtube"
        ? `https://youtube.com/@${input.username}`
        : `https://tiktok.com/@${input.username}`);
  const row: CompetitorAccount = {
    id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    platform,
    username: input.username,
    profileUrl,
    avatarUrl: input.avatarUrl,
    displayName: input.displayName ?? input.username,
    description: input.description,
    addedAt: now,
  };
  store.competitors.unshift(row);
  return row;
}

export function hasCompetitor(username: string, platform: CompetitorAccount["platform"]): boolean {
  const needle = username.trim().toLowerCase();
  return getStore().competitors.some(
    (row) => row.username.trim().toLowerCase() === needle && row.platform === platform,
  );
}

export function listCompetitorVideos(): CompetitorVideo[] {
  return getStore().videos;
}
