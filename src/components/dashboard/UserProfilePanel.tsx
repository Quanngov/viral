"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CREATOR_TYPE_OPTIONS,
  CONTENT_NICHE_OPTIONS,
  EMPTY_ONBOARDING_DRAFT,
  type OnboardingDraft,
  type UserOnboardingProfileData,
} from "@/lib/onboarding/onboarding-types";
import { profileToDraft } from "@/lib/onboarding/onboarding-storage";
import { fetchUserProfile, saveProfileFromDraft } from "@/lib/onboarding/user-profile-client";

type SocialCardProps = {
  platform: "instagram" | "tiktok" | "youtube";
  username: string;
};

const PLATFORM_META = {
  instagram: { label: "Instagram", color: "from-rose-100 to-orange-100", text: "text-rose-800" },
  tiktok: { label: "TikTok", color: "from-zinc-900 to-zinc-700", text: "text-white" },
  youtube: { label: "YouTube", color: "from-red-100 to-red-50", text: "text-red-800" },
} as const;

function SocialProfileCard({ platform, username }: SocialCardProps) {
  const meta = PLATFORM_META[platform];
  const handle = username.trim();
  if (!handle) return null;

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
      <div className={`flex items-center gap-3 bg-gradient-to-r ${meta.color} px-4 py-3`}>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-sm font-bold ${meta.text}`}
        >
          {handle.replace(/^@/, "").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-wide ${meta.text}`}>{meta.label}</p>
          <p className={`truncate text-sm font-semibold ${platform === "tiktok" ? "text-white" : "text-zinc-900"}`}>
            {handle.startsWith("@") ? handle : `@${handle}`}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-px bg-zinc-100 p-px">
        {[
          { k: "Подписчики", v: "Скоро" },
          { k: "Просмотры", v: "Скоро" },
          { k: "Вовлечённость", v: "Скоро" },
        ].map((row) => (
          <div key={row.k} className="bg-white px-2 py-2.5 text-center">
            <dt className="text-[10px] font-medium text-zinc-400">{row.k}</dt>
            <dd className="mt-0.5 text-xs font-semibold text-zinc-500">{row.v}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-zinc-100 px-3 py-2 text-center text-[10px] text-zinc-400">
        Аналитика — Coming soon
      </p>
    </article>
  );
}

function ChipToggle({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-emerald-200"
      }`}
    >
      {label}
    </button>
  );
}

type UserProfilePanelProps = {
  email: string;
  plan: string;
  balanceTokens: number;
};

export function UserProfilePanel({ email, plan, balanceTokens }: UserProfilePanelProps) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_ONBOARDING_DRAFT);
  const [loaded, setLoaded] = useState(false);

  const loadProfile = useCallback(async () => {
    const profile = await fetchUserProfile();
    if (profile) setDraft(profileToDraft(profile));
    setLoaded(true);
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleSave() {
    setBusy(true);
    setSaved(false);
    try {
      await saveProfileFromDraft(draft, true);
      setEditing(false);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  const socialCards = (
    <div className="grid gap-3 sm:grid-cols-2">
      <SocialProfileCard platform="instagram" username={draft.instagramUsername} />
      <SocialProfileCard platform="tiktok" username={draft.tiktokUsername} />
      <SocialProfileCard platform="youtube" username={draft.youtubeChannel} />
    </div>
  );

  const hasSocial =
    draft.instagramUsername.trim() || draft.tiktokUsername.trim() || draft.youtubeChannel.trim();

  return (
    <div className="space-y-4">
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
          <dt className="text-xs font-semibold uppercase text-zinc-400">Email</dt>
          <dd className="mt-0.5 truncate font-medium text-zinc-900">{email}</dd>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
          <dt className="text-xs font-semibold uppercase text-zinc-400">Тариф</dt>
          <dd className="mt-0.5 font-medium text-zinc-900">{plan}</dd>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
          <dt className="text-xs font-semibold uppercase text-zinc-400">Токены</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-zinc-900">
            {balanceTokens.toLocaleString("ru-RU")}
          </dd>
        </div>
      </dl>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">Профиль создателя</h3>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Редактировать
          </button>
        ) : null}
      </div>

      {!loaded ? (
        <p className="text-sm text-zinc-500">Загрузка…</p>
      ) : editing ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-medium text-zinc-600">
              Instagram
              <input
                value={draft.instagramUsername}
                onChange={(e) => setDraft((d) => ({ ...d, instagramUsername: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              TikTok
              <input
                value={draft.tiktokUsername}
                onChange={(e) => setDraft((d) => ({ ...d, tiktokUsername: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              YouTube
              <input
                value={draft.youtubeChannel}
                onChange={(e) => setDraft((d) => ({ ...d, youtubeChannel: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
            </label>
          </div>

          <div>
            <p className="text-xs font-semibold text-zinc-700">Кто вы?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CREATOR_TYPE_OPTIONS.map((opt) => (
                <ChipToggle
                  key={opt}
                  label={opt}
                  active={draft.creatorType === opt}
                  onClick={() => setDraft((d) => ({ ...d, creatorType: d.creatorType === opt ? "" : opt }))}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-zinc-700">Ниши контента</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CONTENT_NICHE_OPTIONS.map((opt) => (
                <ChipToggle
                  key={opt}
                  label={opt}
                  active={draft.contentNiches.includes(opt)}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      contentNiches: d.contentNiches.includes(opt)
                        ? d.contentNiches.filter((n) => n !== opt)
                        : [...d.contentNiches, opt],
                    }))
                  }
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSave()}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? "Сохранение…" : "Сохранить"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                void loadProfile();
              }}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <>
          {hasSocial ? socialCards : (
            <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
              Добавьте соцсети, чтобы персонализировать рекомендации
            </p>
          )}

          {draft.creatorType ? (
            <p className="text-sm text-zinc-700">
              <span className="font-medium text-zinc-500">Роль:</span> {draft.creatorType}
            </p>
          ) : null}

          {draft.contentNiches.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {draft.contentNiches.map((n) => (
                <span key={n} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                  {n}
                </span>
              ))}
            </div>
          ) : null}
        </>
      )}

      {saved ? <p className="text-xs font-medium text-emerald-700">Профиль сохранён</p> : null}
    </div>
  );
}
