"use client";

import { memo } from "react";

type OnboardingSignupStepProps = {
  titleId: string;
  onCreateAccount: () => void;
  onBrowseGuest: () => void;
  busy?: boolean;
};

export const OnboardingSignupStep = memo(function OnboardingSignupStep({
  titleId,
  onCreateAccount,
  onBrowseGuest,
  busy = false,
}: OnboardingSignupStepProps) {
  return (
    <div className="onboarding-signup text-center md:px-6">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-xl font-bold text-white shadow-lg shadow-emerald-600/25">
        V
      </div>
      <h2 id={titleId} className="mt-5 text-xl font-semibold tracking-tight text-zinc-900 md:text-2xl">
        Сохраните настройки в аккаунте
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-600">
        Регистрация нужна, чтобы сохранить персонализацию, синхронизировать настройки между устройствами и
        открыть все функции ViralCloud.
      </p>
      <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left text-sm text-zinc-600">
        {["Сохранение профиля и ниши", "Синхронизация настроек", "Поиск, шпион, сценарии и AI"].map((item) => (
          <li key={item} className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
              ✓
            </span>
            {item}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={busy}
        onClick={onCreateAccount}
        className="mt-8 w-full max-w-sm rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        {busy ? "Сохранение…" : "Создать аккаунт"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onBrowseGuest}
        className="mt-3 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800 disabled:opacity-50"
      >
        Я хочу сначала посмотреть сайт
      </button>
    </div>
  );
});
