"use client";

import { useState } from "react";
import { PlatformIcon } from "@/components/dashboard/PlatformIcon";
import { DashboardModal } from "@/components/dashboard/DashboardModal";
import type { DashboardSocialSummary, MetricTrend } from "@/lib/dashboard-home-types";
import { formatStatValue } from "@/components/dashboard/profile-hub/profile-hub-primitives";

type SocialCardsProps = {
  accounts: DashboardSocialSummary[];
  onConnectManual?: () => void;
};

const PLATFORM_LABEL: Record<DashboardSocialSummary["platform"], string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

function TrendArrow({ trend }: { trend: MetricTrend }) {
  if (!trend || trend === "flat") return null;
  return (
    <span className={`dashboard-home-trend dashboard-home-trend--${trend}`} aria-hidden>
      {trend === "up" ? "▲" : "▼"}
    </span>
  );
}

function Metric({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: MetricTrend;
}) {
  return (
    <div className="dashboard-home-social-card__metric">
      <span className="dashboard-home-social-card__metric-label">{label}</span>
      <span className="dashboard-home-social-card__metric-value">
        <TrendArrow trend={trend} />
        {value}
      </span>
    </div>
  );
}

function CornerIcon({ platform }: { platform: DashboardSocialSummary["platform"] }) {
  return (
    <span className={`dashboard-home-social-card__icon dashboard-home-social-card__icon--${platform}`} aria-hidden>
      <PlatformIcon platform={platform} size={16} />
    </span>
  );
}

function SocialCard({
  acc,
  onRequestConnect,
}: {
  acc: DashboardSocialSummary;
  onRequestConnect: (platform: DashboardSocialSummary["platform"]) => void;
}) {
  const label = PLATFORM_LABEL[acc.platform];

  if (!acc.connected) {
    return (
      <article className="dashboard-home-social-card dashboard-home-social-card--empty">
        <div className="dashboard-home-social-card__body dashboard-home-social-card__body--empty">
          <span className="dashboard-home-social-card__empty-name">{label}</span>
          <button
            type="button"
            onClick={() => onRequestConnect(acc.platform)}
            className="dashboard-home-social-card__connect"
          >
            Подключить
          </button>
        </div>
        <CornerIcon platform={acc.platform} />
      </article>
    );
  }

  const handle = acc.username.replace(/^@/, "");

  return (
    <article className="dashboard-home-social-card dashboard-home-social-card--connected">
      <div className="dashboard-home-social-card__body">
        <div className="dashboard-home-social-card__head">
          <div className="dashboard-home-social-card__avatar">
            {acc.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={acc.avatarUrl} alt="" />
            ) : (
              (handle || label).slice(0, 1).toUpperCase()
            )}
          </div>
          <span className="dashboard-home-social-card__name">{handle ? `@${handle}` : label}</span>
        </div>
        <div className="dashboard-home-social-card__metrics">
          <Metric
            label="Подписчики"
            value={acc.followers != null ? formatStatValue(acc.followers) : "—"}
            trend={acc.followersTrend}
          />
          <Metric
            label="Просмотры за 30 дней"
            value={acc.monthlyViews != null ? formatStatValue(acc.monthlyViews) : "—"}
            trend={acc.monthlyViewsTrend}
          />
        </div>
      </div>
      <CornerIcon platform={acc.platform} />
    </article>
  );
}

function ConnectModal({
  account,
  onClose,
  onConnectManual,
}: {
  account: DashboardSocialSummary;
  onClose: () => void;
  onConnectManual?: () => void;
}) {
  const label = PLATFORM_LABEL[account.platform];

  const handleConnect = () => {
    if (account.connection.oauthAvailable) {
      window.location.href = account.connection.connectPath;
      return;
    }
    onClose();
    onConnectManual?.();
  };

  return (
    <DashboardModal
      open
      onClose={onClose}
      compact
      title={`Подключить ${label}`}
      subtitle="Свяжите аккаунт, чтобы видеть реальную статистику."
    >
      <div className="dashboard-home-connect">
        <section className="dashboard-home-connect__item">
          <h3 className="dashboard-home-connect__title">Что это даст</h3>
          <p className="dashboard-home-connect__text">
            Реальные подписчики, просмотры за 30 дней и динамика роста прямо на главной — без ручного ввода.
          </p>
        </section>
        <section className="dashboard-home-connect__item">
          <h3 className="dashboard-home-connect__title">Зачем вход через аккаунт</h3>
          <p className="dashboard-home-connect__text">
            Официальный вход {label} подтверждает, что аккаунт ваш, и позволяет обновлять статистику автоматически.
          </p>
        </section>
        <section className="dashboard-home-connect__item">
          <h3 className="dashboard-home-connect__title">Какие данные используются</h3>
          <p className="dashboard-home-connect__text">
            Только публичные метрики профиля: имя, аватар, число подписчиков и просмотров. Пароль не сохраняется, публиковать за вас мы не будем.
          </p>
        </section>
        <button type="button" onClick={handleConnect} className="dashboard-home-connect__cta">
          Подключить {label}
        </button>
      </div>
    </DashboardModal>
  );
}

export function DashboardSocialCards({ accounts, onConnectManual }: SocialCardsProps) {
  const [modalPlatform, setModalPlatform] = useState<DashboardSocialSummary["platform"] | null>(null);
  const modalAccount = accounts.find((a) => a.platform === modalPlatform) ?? null;

  return (
    <div className="dashboard-home-social-cards">
      {accounts.map((acc) => (
        <SocialCard key={acc.platform} acc={acc} onRequestConnect={setModalPlatform} />
      ))}
      {modalAccount ? (
        <ConnectModal
          account={modalAccount}
          onClose={() => setModalPlatform(null)}
          onConnectManual={onConnectManual}
        />
      ) : null}
    </div>
  );
}
