"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import type { GridVideo } from "@/lib/mock-data";
import { DashboardAnchoredCard, DashboardModal } from "@/components/dashboard/DashboardModal";

type MockTokenPlansModalProps = {
  open: boolean;
  onClose: () => void;
  balanceTokens: number;
};

const PLANS = [
  { id: "start", name: "Start", tokens: 1_000, price: "990 ₽", desc: "Для старта и тестов гипотез" },
  { id: "pro", name: "Pro", tokens: 5_000, price: "3 490 ₽", desc: "Регулярный выпуск и шпион" },
  { id: "scale", name: "Scale", tokens: 15_000, price: "8 990 ₽", desc: "Команды и высокий объём" },
] as const;

const TOKEN_PACKS = [
  { id: "pack-s", tokens: 500, price: "490 ₽", desc: "Разовое пополнение" },
  { id: "pack-m", tokens: 2_000, price: "1 490 ₽", desc: "На неделю активного поиска" },
  { id: "pack-l", tokens: 5_000, price: "2 990 ₽", desc: "Запас на месяц" },
] as const;

function BalanceBanner({ balanceTokens }: { balanceTokens: number }) {
  return (
    <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
      Текущий баланс:{" "}
      <span className="tabular-nums font-bold">{balanceTokens.toLocaleString("ru-RU")}</span> токенов
    </p>
  );
}

export function AccountPlansContent({ balanceTokens }: { balanceTokens: number }) {
  return (
    <>
      <BalanceBanner balanceTokens={balanceTokens} />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className="flex flex-col rounded-2xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50/80 p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{p.name}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">{p.tokens.toLocaleString("ru-RU")}</p>
            <p className="text-xs text-zinc-500">токенов / месяц</p>
            <p className="mt-2 text-sm font-semibold text-zinc-800">{p.price}</p>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-zinc-600">{p.desc}</p>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Выбрать тариф
            </button>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-zinc-500">Оплата и смена тарифа появятся позже.</p>
    </>
  );
}

export function AccountTokensContent({ balanceTokens }: { balanceTokens: number }) {
  return (
    <>
      <BalanceBanner balanceTokens={balanceTokens} />
      <p className="mt-3 text-sm text-zinc-600">Разовые пакеты токенов. Оплата пока не подключена — только демо.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {TOKEN_PACKS.map((p) => (
          <div
            key={p.id}
            className="flex flex-col rounded-2xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50/80 p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Пакет</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">{p.tokens.toLocaleString("ru-RU")}</p>
            <p className="text-xs text-zinc-500">токенов</p>
            <p className="mt-2 text-sm font-semibold text-zinc-800">{p.price}</p>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-zinc-600">{p.desc}</p>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Пополнить
            </button>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-zinc-500">Оплата и реальное пополнение появятся позже.</p>
    </>
  );
}

export function MockTokenPlansModal({ open, onClose, balanceTokens }: MockTokenPlansModalProps) {
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Тарифы и пополнение"
      subtitle="Оплата пока не подключена — только демо-интерфейс."
      placement="center"
      wide
    >
      <AccountPlansContent balanceTokens={balanceTokens} />
    </DashboardModal>
  );
}

export function AccountProfileContent({
  email,
  plan,
  balanceTokens,
  onLogin,
  onLogout,
}: {
  email: string;
  plan: string;
  balanceTokens: number;
  onLogin?: () => void;
  onLogout?: () => void;
}) {
  return (
    <dl className="space-y-3 text-sm">
      <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
        <dt className="text-xs font-semibold uppercase text-zinc-400">Email</dt>
        <dd className="mt-0.5 font-medium text-zinc-900">{email}</dd>
      </div>
      <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
        <dt className="text-xs font-semibold uppercase text-zinc-400">Тариф</dt>
        <dd className="mt-0.5 font-medium text-zinc-900">{plan}</dd>
      </div>
      <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
        <dt className="text-xs font-semibold uppercase text-zinc-400">Баланс токенов</dt>
        <dd className="mt-0.5 font-medium tabular-nums text-zinc-900">
          {balanceTokens.toLocaleString("ru-RU")}
        </dd>
      </div>
      <p className="text-xs text-zinc-500">
        Реальная авторизация и редактирование профиля будут подключены отдельно. Cookie-сессия токенов не меняется.
      </p>
      {onLogin || onLogout ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {onLogin ? (
            <button
              type="button"
              onClick={onLogin}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-emerald-50"
            >
              Войти
            </button>
          ) : null}
          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-emerald-50"
            >
              Выйти
            </button>
          ) : null}
        </div>
      ) : null}
    </dl>
  );
}

type MockProfileModalProps = {
  open: boolean;
  onClose: () => void;
  email: string;
  plan: string;
  balanceTokens: number;
  anchorRef: RefObject<HTMLElement | null>;
};

export function MockProfileModal({ open, onClose, email, plan, balanceTokens, anchorRef }: MockProfileModalProps) {
  return (
    <DashboardAnchoredCard
      open={open}
      onClose={onClose}
      anchorRef={anchorRef}
      title="Профиль"
      subtitle="Демо-данные, без сохранения в БД."
    >
      <AccountProfileContent email={email} plan={plan} balanceTokens={balanceTokens} />
    </DashboardAnchoredCard>
  );
}

type MockAuthModalProps = { open: boolean; onClose: () => void; mode: "login" | "logout" };

export function MockAuthModal({ open, onClose, mode }: MockAuthModalProps) {
  const [email, setEmail] = useState("demo@trendradar.app");
  const [password, setPassword] = useState("");

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title={mode === "logout" ? "Выход" : "Вход и регистрация"}
      subtitle="Авторизация пока в демо-режиме. Реальные запросы к серверу не отправляются."
      placement="center"
      wide
    >
      {mode === "logout" ? (
        <p className="text-sm text-zinc-600">
          В демо-режиме выход не требуется: анонимная сессия токенов продолжает работать как раньше.
        </p>
      ) : (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-zinc-600">
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              autoComplete="off"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Пароль
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              autoComplete="off"
            />
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Войти
            </button>
            <button
              type="button"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Создать аккаунт
            </button>
          </div>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Продолжить с Google
          </button>
        </div>
      )}
    </DashboardModal>
  );
}

type SettingsTab = "account" | "notifications" | "limits" | "sources" | "appearance";

export function AccountSettingsContent() {
  const [tab, setTab] = useState<SettingsTab>("account");
  const [digest, setDigest] = useState(true);
  const [autoSpy, setAutoSpy] = useState(false);
  const [onlyShort, setOnlyShort] = useState(true);
  const [minScore, setMinScore] = useState(40);
  const [lang, setLang] = useState("ru");
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");

  const tabs: { id: SettingsTab; label: string }[] = useMemo(
    () => [
      { id: "account", label: "Аккаунт" },
      { id: "notifications", label: "Уведомления" },
      { id: "limits", label: "Лимиты и токены" },
      { id: "sources", label: "Источники данных" },
      { id: "appearance", label: "Внешний вид" },
    ],
    [],
  );

  return (
    <>
      <div className="flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === t.id ? "bg-white text-emerald-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4 text-sm">
        {tab === "account" && (
          <p className="text-zinc-600">
            Управление аккаунтом появится позже. Сейчас используется анонимная сессия с балансом токенов в cookie.
          </p>
        )}
        {tab === "notifications" && (
          <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 px-3 py-2">
            <span className="text-zinc-800">Email-дайджест раз в неделю</span>
            <input
              type="checkbox"
              checked={digest}
              onChange={() => setDigest((v) => !v)}
              className="rounded border-zinc-300 text-emerald-600"
            />
          </label>
        )}
        {tab === "limits" && (
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 px-3 py-2">
              <span className="text-zinc-800">Автообновлять шпион при входе</span>
              <input
                type="checkbox"
                checked={autoSpy}
                onChange={() => setAutoSpy((v) => !v)}
                className="rounded border-zinc-300 text-emerald-600"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 px-3 py-2">
              <span className="text-zinc-800">Показывать только Reels / Shorts</span>
              <input
                type="checkbox"
                checked={onlyShort}
                onChange={() => setOnlyShort((v) => !v)}
                className="rounded border-zinc-300 text-emerald-600"
              />
            </label>
            <label className="block rounded-xl border border-zinc-100 px-3 py-2">
              <span className="text-zinc-800">Минимальная оценка ролика</span>
              <input
                type="range"
                min={1}
                max={99}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="mt-2 w-full accent-emerald-600"
              />
              <span className="text-xs text-zinc-500">{minScore}</span>
            </label>
          </div>
        )}
        {tab === "sources" && (
          <label className="block rounded-xl border border-zinc-100 px-3 py-2">
            <span className="text-zinc-800">Язык выдачи</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm"
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </label>
        )}
        {tab === "appearance" && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-zinc-400">Тема интерфейса</p>
            {(["system", "light", "dark"] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-zinc-50">
                <input
                  type="radio"
                  name="theme"
                  checked={theme === t}
                  onChange={() => setTheme(t)}
                  className="text-emerald-600"
                />
                <span className="capitalize text-zinc-800">{t === "system" ? "Системная" : t === "light" ? "Светлая" : "Тёмная"}</span>
              </label>
            ))}
            <p className="text-xs text-zinc-500">Переключение темы в приложении появится позже; сейчас только макет.</p>
          </div>
        )}
      </div>
    </>
  );
}

export function MockSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Настройки"
      subtitle="Только интерфейс, без сохранения."
      placement="drawer-right"
      wide
    >
      <AccountSettingsContent />
    </DashboardModal>
  );
}

type MockScriptGeneratorModalProps = {
  open: boolean;
  onClose: () => void;
  video: GridVideo | null;
};

const STYLES = ["Экспертный", "Дерзкий", "Нативный", "Продающий", "Сторителлинг"] as const;
const LENGTHS = ["15 сек", "30 сек", "60 сек"] as const;
const STRUCTURES = ["Проблема → решение", "3 акта", "До/после", "Сторис-цепочка"] as const;

export function MockScriptGeneratorModal({ open, onClose, video }: MockScriptGeneratorModalProps) {
  const [step, setStep] = useState<"form" | "result">("form");
  const [niche, setNiche] = useState("");
  const [sell, setSell] = useState("");
  const [style, setStyle] = useState<(typeof STYLES)[number]>("Экспертный");
  const [length, setLength] = useState<(typeof LENGTHS)[number]>("30 сек");
  const [structure, setStructure] = useState<(typeof STRUCTURES)[number]>("Проблема → решение");

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- сброс шага при открытии / смене ролика
      setStep("form");
    }
  }, [open, video?.id]);

  const hook = video?.title?.slice(0, 80) ?? "Сильный хук из первых секунд ролика";

  const resetAndClose = () => {
    setStep("form");
    onClose();
  };

  return (
    <DashboardModal
      open={open}
      onClose={resetAndClose}
      title="Генерация сценария"
      subtitle="Демо: без AI и без списания токенов."
      placement="drawer-right"
      drawerSize="lg"
      wide
    >
      {step === "form" ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
            <p className="font-semibold text-zinc-900">Ролик</p>
            <p className="mt-1 line-clamp-2">{video?.title ?? "Новый сценарий без привязки к ролику"}</p>
            {video ? <p className="mt-1 text-zinc-500">Хук: {hook}</p> : null}
          </div>
          <label className="block text-xs font-medium text-zinc-600">
            Под какую нишу адаптировать?
            <input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="Например: EdTech, фитнес, недвижимость"
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Что продаём / о чём канал?
            <textarea
              value={sell}
              onChange={(e) => setSell(e.target.value)}
              placeholder="Кратко: продукт, УТП, аудитория"
              rows={3}
              className="mt-1 w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />
          </label>
          <div>
            <p className="text-xs font-medium text-zinc-600">Структура</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {STRUCTURES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStructure(s)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                    structure === s ? "bg-emerald-600 text-white" : "border border-zinc-200 bg-white text-zinc-700"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-600">Стиль</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                    style === s ? "bg-emerald-600 text-white" : "border border-zinc-200 bg-white text-zinc-700"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-600">Длина</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {LENGTHS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLength(l)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                    length === l ? "bg-emerald-600 text-white" : "border border-zinc-200 bg-white text-zinc-700"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStep("result")}
            className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Сгенерировать
          </button>
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-950">
            Пример результата (не из AI)
          </div>
          <section>
            <h3 className="text-xs font-bold uppercase text-zinc-400">Хук</h3>
            <p className="mt-1 text-zinc-900">
              «{niche || "Ваша ниша"}: три ошибки, из‑за которых зритель уходит в первые 3 секунды».
            </p>
          </section>
          <section>
            <h3 className="text-xs font-bold uppercase text-zinc-400">Сценарий по блокам</h3>
            <ol className="mt-1 list-decimal space-y-1 pl-4 text-zinc-700">
              <li>
                Каркас: {structure}
              </li>
              <li>Зацепка + боль аудитории</li>
              <li>Мини-кейс / доказательство</li>
              <li>Раскрытие: {sell || "ваше предложение"}</li>
              <li>Переход к CTA</li>
            </ol>
          </section>
          <section>
            <h3 className="text-xs font-bold uppercase text-zinc-400">Текст для озвучки</h3>
            <p className="mt-1 leading-relaxed text-zinc-700">
              Короткий текст на {length} в тоне «{style}»: объясняем ценность, добавляем паузы под монтаж.
            </p>
          </section>
          <section>
            <h3 className="text-xs font-bold uppercase text-zinc-400">Идея визуала</h3>
            <p className="mt-1 text-zinc-700">Крупный план + субтитры на экране + B-roll из ниши.</p>
          </section>
          <section>
            <h3 className="text-xs font-bold uppercase text-zinc-400">CTA</h3>
            <p className="mt-1 text-zinc-700">Подписка / переход в профиль / комментарий одним словом.</p>
          </section>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
              onClick={() => void navigator.clipboard?.writeText("Mock сценарий TrendRadar")}
            >
              Скопировать
            </button>
            <button type="button" className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800">
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => setStep("form")}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900"
            >
              Сделать ещё вариант
            </button>
          </div>
        </div>
      )}
    </DashboardModal>
  );
}

export function MockSimpleInfoModal({
  open,
  onClose,
  title,
  body,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
}) {
  return (
    <DashboardModal open={open} onClose={onClose} title={title} placement="center">
      <p className="text-sm leading-relaxed text-zinc-600">{body}</p>
    </DashboardModal>
  );
}
