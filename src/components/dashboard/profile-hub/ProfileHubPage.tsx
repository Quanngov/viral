"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Crown,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import type { GridVideo } from "@/lib/mock-data";
import type { ProfileHubPayload, ProfileSocialAccount, SocialPlatform } from "@/lib/profile/profile-types";
import {
  CREATOR_TYPE_OPTIONS,
  CONTENT_NICHE_OPTIONS,
  type OnboardingDraft,
} from "@/lib/onboarding/onboarding-types";
import { profileToDraft } from "@/lib/onboarding/onboarding-storage";
import {
  fetchProfileHub,
  refreshProfileHub,
  removeSocialAccountClient,
  requestAiProfileAnalysis,
  saveProfileSettings,
  saveSocialAccount,
  type ProfileHubFetchResult,
} from "@/lib/profile/profile-hub-client";
import { formatTokensRuSpace } from "@/lib/format-metrics";
import { VideoThumbnail } from "@/components/dashboard/VideoThumbnail";
import { PlatformIcon } from "@/components/dashboard/PlatformIcon";
import { ProfileAnimatedNumber } from "@/components/dashboard/profile-hub/ProfileAnimatedNumber";
import {
  formatPercent,
  formatProfileRefreshLabel,
  formatStatValue,
  IntegrationBadge,
  PremiumLockOverlay,
  ProfileSection,
  ProfileSkeleton,
} from "@/components/dashboard/profile-hub/profile-hub-primitives";

import "./profile-hub.css";

const PLATFORM_META: Record<SocialPlatform, { label: string; gradient: string; placeholder: string }> = {
  instagram: { label: "Instagram", gradient: "from-rose-500 to-orange-400", placeholder: "@username" },
  tiktok: { label: "TikTok", gradient: "from-zinc-800 to-zinc-600", placeholder: "@username" },
  youtube: { label: "YouTube", gradient: "from-red-600 to-red-500", placeholder: "канал" },
};

function hubVideoToGrid(v: ProfileHubPayload["topVideos"][0]): GridVideo {
  return {
    id: v.id,
    platform: v.platform as GridVideo["platform"],
    externalId: v.externalId,
    title: v.title,
    channel: "",
    views: String(v.views),
    likes: String(v.likes),
    thumbnailUrl: v.thumbnailUrl,
    url: v.url,
    publishedAt: v.publishedAt ?? "",
    publishedAtIso: v.publishedAt ?? undefined,
    rating: 0,
    score: 0,
    viralScore: 0,
    viralLabel: "Stable",
    comments: v.comments,
    engagementRate: v.engagementRate ?? undefined,
  };
}

type ProfileHubPageProps = {
  active: boolean;
  onVideoClick?: (video: GridVideo) => void;
  onUpgrade?: () => void;
  onBuyTokens?: () => void;
};

export function ProfileHubPage({ active, onVideoClick, onUpgrade, onBuyTokens }: ProfileHubPageProps) {
  const [hub, setHub] = useState<ProfileHubPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<ProfileHubFetchResult & { ok: false } | null>(null);
  const [editingSettings, setEditingSettings] = useState(false);
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const [socialEdit, setSocialEdit] = useState<SocialPlatform | null>(null);
  const [socialDraft, setSocialDraft] = useState("");
  const [socialSaveError, setSocialSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);

  const applyResult = useCallback((result: ProfileHubFetchResult) => {
    if (result.ok) {
      setHub(result.hub);
      setLoadError(null);
      setDraft(
        profileToDraft({
          instagramUsername: result.hub.settings.instagramUsername,
          tiktokUsername: result.hub.settings.tiktokUsername,
          youtubeChannel: result.hub.settings.youtubeChannel,
          creatorType: result.hub.settings.creatorType,
          contentNiches: result.hub.settings.contentNiches,
          referenceLinks: [],
          onboardingDoneAt: null,
        }),
      );
    } else {
      setLoadError(result);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const result = await fetchProfileHub();
    applyResult(result);
    setLoading(false);
  }, [applyResult]);

  useEffect(() => {
    if (!active) return;
    void load();
  }, [active, load]);

  // After returning from the OAuth consent screen (/?tab=profile&social_connected=…)
  // drop the stale dashboard-home cache and clean the URL so the freshly synced
  // account + stats are shown immediately.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("social_connected");
    if (!connected) return;
    void import("@/lib/dashboard-home-client").then((m) => m.invalidateDashboardHomeCache());
    setSocialSaveError(null);
    params.delete("social_connected");
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    void load();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    if (!hub?.analytics.autoRefreshEnabled) return;
    setRefreshing(true);
    const result = await refreshProfileHub();
    applyResult(result);
    setRefreshing(false);
  }, [hub?.analytics.autoRefreshEnabled, applyResult]);

  const handleSaveSocial = useCallback(async (platform: SocialPlatform) => {
    setBusy(true);
    setSocialSaveError(null);
    const result = await saveSocialAccount(platform, socialDraft);
    if (result.ok) {
      applyResult(result);
      setSocialEdit(null);
    } else {
      setSocialSaveError(result.message);
    }
    setBusy(false);
  }, [socialDraft, applyResult]);

  const handleRemoveSocial = useCallback(async (platform: SocialPlatform) => {
    setBusy(true);
    setSocialSaveError(null);
    setSocialEdit(null);

    setHub((prev) => (prev ? applyDisconnectedSocial(prev, platform) : prev));
    if (draft) {
      const settingsKey =
        platform === "instagram"
          ? "instagramUsername"
          : platform === "tiktok"
            ? "tiktokUsername"
            : "youtubeChannel";
      setDraft({ ...draft, [settingsKey]: "" });
    }

    const result = await removeSocialAccountClient(platform);
    if (result.ok) {
      applyResult(result);
    } else {
      setSocialSaveError(result.message);
      void load();
    }
    setBusy(false);
  }, [applyResult, draft, load]);

  const handleSaveSettings = useCallback(async () => {
    if (!draft) return;
    setBusy(true);
    applyResult(await saveProfileSettings(draft));
    setEditingSettings(false);
    setBusy(false);
  }, [draft, applyResult]);

  const handleAiAnalysis = useCallback(async () => {
    setAiMsg(null);
    setBusy(true);
    const res = await requestAiProfileAnalysis();
    setAiMsg(res.message);
    setBusy(false);
  }, []);

  if (!active) return null;

  if (loading && !hub && !loadError) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <ProfileSkeleton rows={8} />
      </div>
    );
  }

  if (loadError && !hub) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8">
          <p className="text-base font-semibold text-red-900">Не удалось загрузить профиль</p>
          <p className="mt-2 text-sm text-red-800">{loadError.message}</p>
          <p className="mt-1 text-xs text-red-600">
            Код: {loadError.error}
            {loadError.status ? ` · HTTP ${loadError.status}` : ""}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  if (!hub) return null;

  const refreshLabel = formatProfileRefreshLabel(hub.analytics.lastRefreshedAt, hub.analytics.justRefreshed);
  const hasConnectedSocial = hub.socialAccounts.some((a) => a.connected);

  return (
    <div className="profile-hub-page mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Hero header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-xl font-bold text-white shadow-lg shadow-emerald-600/25">
            {hub.overview.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hub.overview.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              hub.overview.name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{hub.overview.name}</h1>
            <p className="text-sm text-zinc-500">{hub.overview.email}</p>
          </div>
        </div>
        <p
          className={`text-xs font-medium ${refreshing ? "profile-hub-refresh-pulse text-emerald-700" : "text-zinc-500"}`}
        >
          {refreshing ? "Обновляем статистику…" : refreshLabel}
        </p>
      </header>

      {/* Overview cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <OverviewCard
          label="Тариф"
          value={hub.overview.planName}
          sub={hub.overview.planStatus}
          icon={<Crown className="h-4 w-4" />}
          accent="emerald"
        />
        <OverviewCard
          label="Токены"
          value={<ProfileAnimatedNumber value={hub.overview.tokenBalance} animate={!loading} />}
          sub="баланс"
          icon={<Zap className="h-4 w-4" />}
          accent="emerald"
        />
        <OverviewCard
          label="Поисков"
          value={<ProfileAnimatedNumber value={hub.overview.searchesRemaining} animate={!loading} />}
          sub={`${hub.subscription.actionCosts.SEARCH} токенов`}
          icon={<Search className="h-4 w-4" />}
        />
        <OverviewCard
          label="AI-сценарии"
          value={<ProfileAnimatedNumber value={hub.overview.aiGenerationsRemaining} animate={!loading} />}
          sub={`${hub.subscription.actionCosts.SCRIPT} токенов`}
          icon={<Sparkles className="h-4 w-4" />}
        />
        <OverviewCard
          label="Продление"
          value={
            hub.overview.renewsAt
              ? new Date(hub.overview.renewsAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
              : "—"
          }
          sub="подписка"
          icon={<RefreshCw className="h-4 w-4" />}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="space-y-5">
        {/* Social */}
        <ProfileSection
          title="Соцсети"
          subtitle="Подключите аккаунты для персонализации и аналитики."
          action={
            hub.analytics.autoRefreshEnabled ? (
              <button
                type="button"
                disabled={refreshing}
                onClick={() => void handleRefresh()}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:border-emerald-300 disabled:opacity-50"
              >
                {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Синхронизировать
              </button>
            ) : null
          }
        >
          {!hasConnectedSocial ? (
            <p className="mb-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-600">
              Подключите Instagram, TikTok или YouTube, чтобы получать персональные рекомендации и аналитику.
            </p>
          ) : null}
          {socialSaveError ? (
            <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {socialSaveError}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hub.socialAccounts.map((acc) => (
              <SocialAccountCard
                key={acc.platform}
                account={acc}
                editing={socialEdit === acc.platform}
                draft={socialDraft}
                busy={busy}
                animateStats={hub.analytics.justRefreshed || refreshing}
                onEdit={() => {
                  setSocialEdit(acc.platform);
                  setSocialDraft(acc.username);
                  setSocialSaveError(null);
                }}
                onDraftChange={setSocialDraft}
                onSave={() => void handleSaveSocial(acc.platform)}
                onCancel={() => setSocialEdit(null)}
                onRemove={() => void handleRemoveSocial(acc.platform)}
              />
            ))}
          </div>
        </ProfileSection>

        {/* Recommendations */}
        <ProfileSection title="Рекомендовано для вас" subtitle="Подборка обновляется по мере развития профиля.">
          <div className="space-y-5">
            {hub.recommendationGroups.map((group) => (
              <div key={group.id}>
                <h4 className="text-sm font-semibold text-zinc-900">{group.title}</h4>
                {group.items.length > 0 ? (
                  <div className="-mx-1 mt-2 flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-hidden">
                    {group.items.map((rec) => (
                      <button
                        key={`${group.id}-${rec.video.id}`}
                        type="button"
                        onClick={() => onVideoClick?.(hubVideoToGrid(rec.video))}
                        className="w-[156px] shrink-0 rounded-xl border border-zinc-200 bg-white p-2.5 text-left shadow-sm transition-all hover:border-emerald-300 hover:shadow-md"
                      >
                        <div className="relative aspect-[9/12] overflow-hidden rounded-lg bg-zinc-100">
                          <VideoThumbnail
                            platform={rec.video.platform}
                            externalId={rec.video.externalId}
                            clientId={rec.video.id}
                            thumbnailUrl={rec.video.thumbnailUrl}
                            alt=""
                            fill
                            native
                            sizes="156px"
                            className="h-full w-full"
                          />
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs font-semibold text-zinc-900">{rec.video.title}</p>
                        <p className="mt-1 text-[10px] leading-snug text-emerald-700">{rec.reason}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 rounded-xl border border-dashed border-zinc-200 px-4 py-4 text-sm text-zinc-500">
                    {group.emptyHint}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ProfileSection>

        {/* Top videos */}
        <ProfileSection
          title="Лучшие ролики"
          subtitle="Из сохранённых. После API — из ваших аккаунтов."
        >
          {hub.topVideos.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {hub.topVideos.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onVideoClick?.(hubVideoToGrid(v))}
                  className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 px-3 py-2.5 text-left transition-colors hover:border-emerald-200 hover:bg-white"
                >
                  <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                    <VideoThumbnail
                      platform={v.platform}
                      externalId={v.externalId}
                      thumbnailUrl={v.thumbnailUrl}
                      alt=""
                      fill
                      native
                      sizes="44px"
                      className="h-full w-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium text-zinc-900">{v.title}</p>
                    <p className="text-[11px] text-zinc-500">
                      {formatStatValue(v.views)} просм. · {formatStatValue(v.likes)} лайков
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
              Сохраните ролики в ViralCloud — они появятся в этом разделе.
            </p>
          )}
        </ProfileSection>

        {/* AI Analysis */}
        <ProfileSection title="AI-разбор аккаунта">
          {!hub.aiAnalysis.available ? (
            <PremiumLockOverlay
              title="Полный отчёт по вашему аккаунту"
              description="Сильные стороны, слабые места, 20 идей для роликов и сравнение с конкурентами — на тарифе Pro+."
              onUpgrade={onUpgrade}
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950 p-5 text-white shadow-xl">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/30">
                  <Sparkles className="h-6 w-6 text-emerald-300" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold tracking-tight">Персональный AI-отчёт</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                    Анализ последних роликов и подключённых профилей: хуки, монтаж, регулярность, ниша и конкуренты.
                    Вы получите структурированный документ с{" "}
                    <span className="font-semibold text-white">20 идеями</span> для следующих публикаций.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {hub.aiAnalysis.reportSections.map((section) => (
                  <div
                    key={section}
                    className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-zinc-200 ring-1 ring-white/10"
                  >
                    <span className="text-emerald-400">✓</span>
                    {section}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
                <p className="text-sm text-zinc-300">
                  Стоимость:{" "}
                  <span className="font-bold tabular-nums text-white">
                    {formatTokensRuSpace(hub.aiAnalysis.tokenCost)} токенов
                  </span>
                </p>
                {hub.aiAnalysis.insufficientTokens ? (
                  <p className="text-sm text-amber-300">
                    Недостаточно токенов ({hub.overview.tokenBalance}).{" "}
                    {onBuyTokens ? (
                      <button type="button" onClick={onBuyTokens} className="font-semibold underline">
                        Пополнить
                      </button>
                    ) : null}
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleAiAnalysis()}
                    className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {busy ? "Запрос…" : "Получить отчёт"}
                  </button>
                )}
                {aiMsg ? <p className="w-full text-xs text-zinc-400">{aiMsg}</p> : null}
              </div>
            </div>
          )}
        </ProfileSection>

        {/* Analytics upgrade notice */}
        {hub.analytics.needsUpgradeForAutoRefresh ? (
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Автообновление статистики — на тарифах Pro и выше.{" "}
            {onUpgrade ? (
              <button type="button" onClick={onUpgrade} className="font-semibold underline">
                Улучшить тариф
              </button>
            ) : null}
          </div>
        ) : null}

        {!hub.analytics.planFeatures.growthCharts ? (
          <PremiumLockOverlay
            title="Историческая аналитика"
            description="Графики роста и бенчмарки конкурентов — на тарифе Business."
            onUpgrade={onUpgrade}
          />
        ) : null}

        {/* Settings */}
        <ProfileSection
          title="Настройки"
          action={
            !editingSettings ? (
              <button
                type="button"
                onClick={() => setEditingSettings(true)}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
              >
                Редактировать
              </button>
            ) : null
          }
        >
          {editingSettings && draft ? (
            <SettingsEditor
              draft={draft}
              onChange={setDraft}
              busy={busy}
              onSave={() => void handleSaveSettings()}
              onCancel={() => setEditingSettings(false)}
            />
          ) : (
            <div className="space-y-2 text-sm text-zinc-700">
              {hub.settings.creatorType ? (
                <p>
                  <span className="text-zinc-500">Роль:</span> {hub.settings.creatorType}
                </p>
              ) : (
                <p className="text-zinc-500">Укажите тип создателя — рекомендации станут точнее.</p>
              )}
              {hub.settings.contentNiches.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {hub.settings.contentNiches.map((n) => (
                    <span key={n} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium">
                      {n}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500">Добавьте нишу контента в настройках.</p>
              )}
            </div>
          )}
        </ProfileSection>

        {/* Subscription */}
        <ProfileSection title="Подписка">
          <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xl font-bold text-zinc-900">{hub.subscription.planName}</p>
                <p className="text-xs text-zinc-500">{hub.subscription.status}</p>
              </div>
              {onUpgrade ? (
                <button
                  type="button"
                  onClick={onUpgrade}
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Улучшить
                </button>
              ) : null}
            </div>
            <ul className="mt-3 space-y-1">
              {hub.subscription.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-zinc-700">
                  <span className="text-emerald-600">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </ProfileSection>
      </div>
    </div>
  );
}

function OverviewCard({
  label,
  value,
  sub,
  icon,
  accent,
  className = "",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon: React.ReactNode;
  accent?: "emerald";
  className?: string;
}) {
  return (
    <div
      className={`profile-hub-stat-enter rounded-2xl border p-3.5 shadow-sm ${
        accent === "emerald"
          ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white"
          : "border-zinc-200/80 bg-white"
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
        <span className={accent === "emerald" ? "text-emerald-600" : "text-zinc-400"}>{icon}</span>
      </div>
      <p className={`mt-1.5 text-lg font-bold tracking-tight ${accent === "emerald" ? "text-emerald-900" : "text-zinc-900"}`}>
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-[10px] text-zinc-500">{sub}</p> : null}
    </div>
  );
}

function SocialAccountCard({
  account,
  editing,
  draft,
  busy,
  animateStats,
  onEdit,
  onDraftChange,
  onSave,
  onCancel,
  onRemove,
}: {
  account: ProfileSocialAccount;
  editing: boolean;
  draft: string;
  busy: boolean;
  animateStats: boolean;
  onEdit: () => void;
  onDraftChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const meta = PLATFORM_META[account.platform];
  const pf = account.platform === "youtube" ? "youtube" : account.platform;

  if (editing) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-3">
        <p className="text-xs font-semibold text-zinc-700">{meta.label}</p>
        <input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={meta.placeholder}
          className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onSave}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Сохранить
          </button>
          <button type="button" onClick={onCancel} className="text-xs text-zinc-500">
            Отмена
          </button>
        </div>
      </div>
    );
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="relative">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-sm font-bold text-zinc-700">
            {account.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : account.connected ? (
              account.username.slice(0, 1).toUpperCase()
            ) : (
              "+"
            )}
          </div>
          <span className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 shadow-sm">
            <PlatformIcon platform={pf} size={14} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{meta.label}</p>
          <p className="truncate text-sm font-semibold text-zinc-900">
            {account.connected
              ? `@${account.username.replace(/^@/, "")}`
              : account.sync.connectionStatus === "revoked"
                ? "Требуется переподключение"
                : "Не подключено"}
          </p>
          {account.connected ? (
            <p className="text-[10px] text-zinc-500">
              {account.sync.lastSyncSuccessAt
                ? `Обновлено: ${formatProfileRefreshLabel(account.sync.lastSyncSuccessAt, false)}`
                : account.statsUpdatedAt
                  ? `Кэш: ${formatProfileRefreshLabel(account.statsUpdatedAt, false)}`
                  : "Ожидает синхронизации"}
              {account.sync.nextSyncAt ? (
                <span className="text-zinc-400">
                  {" "}
                  · след. {formatProfileRefreshLabel(account.sync.nextSyncAt, false)}
                </span>
              ) : null}
            </p>
          ) : null}
          {account.connected ? (
            <p className="text-[10px] capitalize text-zinc-400">
              {account.sync.connectionHealth}
              {account.sync.syncStatus === "queued" || account.sync.syncStatus === "running"
                ? " · синхронизация…"
                : null}
            </p>
          ) : null}
        </div>
        {account.connected ? <IntegrationBadge source={account.statsSource} /> : null}
      </div>

      {account.connected ? (
        <>
          <dl className="grid grid-cols-2 gap-px border-t border-zinc-100 bg-zinc-100">
            {[
              { k: "Подписчики", v: account.followers },
              { k: "Ср. просмотры", v: account.avgViews },
              { k: "Вовлечённость", v: account.avgEngagement, pct: true },
              { k: "Рост", v: account.growthPercent, pct: true, growth: true },
            ].map((row) => (
              <div key={row.k} className="bg-white px-2.5 py-2">
                <dt className="text-[9px] font-medium text-zinc-400">{row.k}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-zinc-800">
                  {row.pct && row.growth ? (
                    formatPercent(row.v)
                  ) : row.pct ? (
                    row.v != null ? (
                      <ProfileAnimatedNumber value={Math.round(row.v * 10) / 10} animate={animateStats} suffix="%" />
                    ) : (
                      "—"
                    )
                  ) : row.v != null ? (
                    <ProfileAnimatedNumber value={row.v} animate={animateStats} />
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex gap-2 border-t border-zinc-100 px-3 py-2">
            <button type="button" onClick={onEdit} className="text-xs font-medium text-emerald-700">
              Изменить
            </button>
            <button type="button" onClick={onRemove} className="text-xs text-zinc-400 hover:text-red-600">
              Отключить
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-2 border-t border-zinc-100 px-3 py-3">
          <a
            href={account.sync.oauthConnectPath}
            className="flex w-full items-center justify-center rounded-lg bg-zinc-900 py-2 text-xs font-medium text-white hover:bg-zinc-800"
          >
            {account.sync.connectionStatus === "revoked"
              ? `Переподключить ${meta.label}`
              : `Подключить ${meta.label}`}
          </a>
          <button
            type="button"
            onClick={onEdit}
            className="w-full rounded-lg border border-dashed border-zinc-200 py-2 text-xs font-medium text-zinc-600 hover:border-emerald-300 hover:text-emerald-800"
          >
            Ввести username вручную
          </button>
        </div>
      )}
    </article>
  );
}

function SettingsEditor({
  draft,
  onChange,
  busy,
  onSave,
  onCancel,
}: {
  draft: OnboardingDraft;
  onChange: (d: OnboardingDraft) => void;
  busy: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {(["instagramUsername", "tiktokUsername", "youtubeChannel"] as const).map((key) => (
          <label key={key} className="block text-xs font-medium text-zinc-600">
            {key === "instagramUsername" ? "Instagram" : key === "tiktokUsername" ? "TikTok" : "YouTube"}
            <input
              value={draft[key]}
              onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-sm outline-none focus:border-emerald-400"
            />
          </label>
        ))}
      </div>
      <div>
        <p className="text-xs font-semibold text-zinc-700">Кто вы?</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {CREATOR_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange({ ...draft, creatorType: draft.creatorType === opt ? "" : opt })}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                draft.creatorType === opt
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-zinc-200 text-zinc-700"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-zinc-700">Ниши</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {CONTENT_NICHE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() =>
                onChange({
                  ...draft,
                  contentNiches: draft.contentNiches.includes(opt)
                    ? draft.contentNiches.filter((n) => n !== opt)
                    : [...draft.contentNiches, opt],
                })
              }
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                draft.contentNiches.includes(opt)
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-zinc-200 text-zinc-700"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onSave}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Сохранение…" : "Сохранить"}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-zinc-500">
          Отмена
        </button>
      </div>
    </div>
  );
}

function disconnectedSocialAccount(platform: SocialPlatform): ProfileSocialAccount {
  return {
    platform,
    username: "",
    displayName: "",
    avatarUrl: "",
    profileUrl: "",
    connected: false,
    statsSource: "pending",
    statsUpdatedAt: null,
    followers: null,
    totalLikes: null,
    avgViews: null,
    avgEngagement: null,
    postingFreq: null,
    lastUploadAt: null,
    growthPercent: null,
    bestVideo: null,
    sync: {
      authMethod: null,
      connectionStatus: "disconnected",
      connectionHealth: "disconnected",
      syncStatus: "idle",
      updateStrategy: "polling",
      lastSyncAt: null,
      lastSyncSuccessAt: null,
      nextSyncAt: null,
      lastSyncFailedAt: null,
      lastSyncError: null,
      manualRefreshAvailable: false,
      oauthConnectPath: `/api/social/oauth/${platform}/start`,
    },
  };
}

function applyDisconnectedSocial(hub: ProfileHubPayload, platform: SocialPlatform): ProfileHubPayload {
  const settingsKey =
    platform === "instagram"
      ? "instagramUsername"
      : platform === "tiktok"
        ? "tiktokUsername"
        : "youtubeChannel";

  return {
    ...hub,
    settings: { ...hub.settings, [settingsKey]: "" },
    socialAccounts: hub.socialAccounts.map((a) =>
      a.platform === platform ? disconnectedSocialAccount(platform) : a,
    ),
  };
}
