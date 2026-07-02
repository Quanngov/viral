"use client";

import { AdminPreviewBanner } from "@/components/admin/shell/AdminPrimitives";
import { AdminPageHeader } from "@/components/admin/shell/AdminPageHeader";

type PreviewPageProps = {
  title: string;
  description: string;
  bullets?: string[];
};

export function AdminPreviewPage({ title, description, bullets }: PreviewPageProps) {
  return (
    <div className="space-y-6">
      <AdminPageHeader status="preview" title={title} description={description} />
      <AdminPreviewBanner />
      {bullets?.length ? (
        <ul className="space-y-2 text-sm text-zinc-600">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="text-emerald-600">·</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function AdminUsersPage() {
  return (
    <AdminPreviewPage
      title="Пользователи"
      description="Поиск, фильтры, баланс токенов, подписка, бан, заметки."
      bullets={[
        "Поиск по email / id",
        "Ручная корректировка токенов (ADMIN_ADJUSTMENT)",
        "Grant / revoke subscription",
        "Temporary ban и activity log",
      ]}
    />
  );
}

export function AdminSubscriptionsPage() {
  return (
    <AdminPreviewPage
      title="Подписки"
      description="Активные UserSubscription, trial, renewals."
      bullets={["Фильтр по plan / status", "Продление и отмена", "История периодов"]}
    />
  );
}

export function AdminDiscoveryPage() {
  return (
    <AdminPreviewPage
      title="Discovery Pipeline"
      description="detect-trend-candidates, feed ingest, throttled detector."
      bullets={[
        "Release delay +5…+25 мин для queued trends",
        "Lazy refresh pool fill",
        "Ingest batch size и quality floor",
      ]}
    />
  );
}

export function AdminQueuesPage() {
  return (
    <AdminPreviewPage
      title="Очереди"
      description="Объединённый вид очередей платформы. Trend queue — в разделе Realtime Trends (live)."
      bullets={["TrendItem queue → /admin/trends", "Ingest backlog", "Thumbnail repair", "Competitor sync"]}
    />
  );
}

export function AdminSearchSettingsPage() {
  return (
    <AdminPreviewPage
      title="Поиск"
      description="Feed ranking, period filters, platform modes."
      bullets={["Период month/week", "Language mode world/ru", "Token cost per search"]}
    />
  );
}

export function AdminJobsPage() {
  return (
    <AdminPreviewPage
      title="Фоновые задачи"
      description="Cron, competitor daily sync, lazy trends refresh."
      bullets={["Schedule overview", "Last run / next run", "Manual trigger"]}
    />
  );
}

export function AdminVideoProcessingPage() {
  return (
    <AdminPreviewPage
      title="Обработка видео"
      description="Транскрипция, thumbnail health, invalid status cleanup."
      bullets={["Groq Whisper jobs", "thumbnailFailCount", "Instagram CDN refresh"]}
    />
  );
}

export function AdminScrapersPage() {
  return (
    <AdminPreviewPage
      title="Скраперы"
      description="YouTube search ingest и Instagram reels via TikHub."
      bullets={["Rate limits", "Last sync per platform", "Error rate"]}
    />
  );
}

export function AdminCostsPage() {
  return (
    <AdminPreviewPage
      title="Затраты"
      description="AI cost per generation, unit economics, margin by plan."
      bullets={["DeepSeek tokens in/out", "Whisper minutes", "Revenue vs COGS"]}
    />
  );
}

export function AdminErrorsPage() {
  return (
    <AdminPreviewPage
      title="Ошибки"
      description="Агрегация error-level admin events и Sentry issues."
      bullets={["Group by route", "Trend realtime errors", "Billing transaction failures"]}
    />
  );
}

export function AdminMonitoringPage() {
  return (
    <AdminPreviewPage
      title="Мониторинг"
      description="Sentry, uptime, alerting."
      bullets={["API p95 latency", "DB pool saturation", "Alert channels"]}
    />
  );
}

export function AdminApiKeysPage() {
  return (
    <AdminPreviewPage
      title="API Keys"
      description="Ротация ключей провайдеров без отображения значений."
      bullets={["Masked key ids", "Last rotated", "Scope per service"]}
    />
  );
}

export function AdminFlagsPage() {
  return (
    <AdminPreviewPage
      title="Feature Flags"
      description="Постепенный rollout функций."
      bullets={["Billing gate", "Instagram ingest", "Script generator v2"]}
    />
  );
}

export function AdminSettingsPage() {
  return (
    <AdminPreviewPage
      title="Настройки"
      description="Глобальные параметры платформы."
      bullets={["ADMIN_SECRET rotation", "Default locale", "Maintenance mode"]}
    />
  );
}
