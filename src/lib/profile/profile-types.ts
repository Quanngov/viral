/** Profile Hub — shared types (client + server). */

export type SocialPlatform = "instagram" | "tiktok" | "youtube";

export type StatsSource = "pending" | "api" | "manual";

export type ProfileTopVideo = {
  id: string;
  platform: string;
  externalId: string;
  title: string;
  thumbnailUrl: string;
  url: string;
  views: number;
  likes: number;
  comments: number;
  engagementRate: number | null;
  publishedAt: string | null;
  source: "saved" | "social" | "recommended";
};

export type ProfileBestVideo = {
  title: string;
  thumbnailUrl: string;
  url: string;
  views: number | null;
};

export type ProfileSocialAccount = {
  platform: SocialPlatform;
  username: string;
  displayName: string;
  avatarUrl: string;
  profileUrl: string;
  connected: boolean;
  statsSource: StatsSource;
  statsUpdatedAt: string | null;
  followers: number | null;
  totalLikes: number | null;
  avgViews: number | null;
  avgEngagement: number | null;
  postingFreq: string | null;
  lastUploadAt: string | null;
  growthPercent: number | null;
  bestVideo: ProfileBestVideo | null;
  sync: ProfileSocialSyncMeta;
};

export type ProfileSocialSyncMeta = {
  authMethod: "manual" | "oauth" | null;
  connectionStatus: string;
  connectionHealth: string;
  syncStatus: string;
  updateStrategy: string;
  lastSyncAt: string | null;
  lastSyncSuccessAt: string | null;
  nextSyncAt: string | null;
  lastSyncFailedAt: string | null;
  lastSyncError: string | null;
  manualRefreshAvailable: boolean;
  oauthConnectPath: string;
};

export type ProfileRecommendation = {
  video: ProfileTopVideo;
  reason: string;
  tag: string;
  group: "trending" | "similar" | "recreate";
};

export type ProfileRecommendationGroup = {
  id: "trending" | "similar" | "recreate";
  title: string;
  emptyHint: string;
  items: ProfileRecommendation[];
};

export type ProfilePlanFeatures = {
  autoRefreshHours: number | null;
  historicalAnalytics: boolean;
  growthCharts: boolean;
  advancedEngagement: boolean;
  competitiveBenchmarks: boolean;
  aiProfileAnalysis: boolean;
};

export type ProfileHubOverview = {
  name: string;
  email: string;
  avatarUrl: string | null;
  planId: string;
  planName: string;
  planStatus: string;
  renewsAt: string | null;
  tokenBalance: number;
  searchesRemaining: number;
  aiGenerationsRemaining: number;
  totalSpent: number;
};

export type ProfileHubSettings = {
  creatorType: string;
  contentNiches: string[];
  instagramUsername: string;
  tiktokUsername: string;
  youtubeChannel: string;
};

export type ProfileHubAnalytics = {
  lastRefreshedAt: string | null;
  justRefreshed: boolean;
  autoRefreshEnabled: boolean;
  autoRefreshHours: number | null;
  needsUpgradeForAutoRefresh: boolean;
  planFeatures: ProfilePlanFeatures;
};

export type ProfileAiAnalysisPreview = {
  tokenCost: number;
  available: boolean;
  insufficientTokens: boolean;
  lastAnalysisAt: string | null;
  status: "idle" | "pending" | "completed" | "failed";
  reportSections: string[];
};

export type ProfileHubPayload = {
  overview: ProfileHubOverview;
  settings: ProfileHubSettings;
  socialAccounts: ProfileSocialAccount[];
  analytics: ProfileHubAnalytics;
  topVideos: ProfileTopVideo[];
  recommendationGroups: ProfileRecommendationGroup[];
  subscription: {
    planId: string;
    planName: string;
    status: string;
    features: string[];
    tokensPerPeriod: number;
    renewsAt: string | null;
    trialEndsAt: string | null;
    maxCompetitors: number;
    tokenBalance: number;
    totalSpent: number;
    actionCosts: Record<string, number>;
  };
  aiAnalysis: ProfileAiAnalysisPreview;
};

export const AI_PROFILE_ANALYSIS_TOKEN_COST = 500;

export const AI_PROFILE_REPORT_SECTIONS = [
  "Сильные стороны",
  "Слабые стороны",
  "Паттерны контента",
  "Почему ролики работают или нет",
  "Регулярность публикаций",
  "Анализ хуков",
  "Стиль монтажа",
  "Возможности в нише",
  "Сравнение с конкурентами",
  "Персональные рекомендации",
  "20 идей для будущих роликов",
] as const;

export const RECOMMENDATION_TAGS = [
  "Сейчас набирает популярность в вашей нише",
  "Похоже на ваш формат",
  "Высокий потенциал",
  "Конкуренты начали использовать этот формат",
] as const;
