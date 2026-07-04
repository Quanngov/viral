"use client";

import { memo, type ReactNode } from "react";
import {
  CREATOR_TYPE_OPTIONS,
  CONTENT_NICHE_OPTIONS,
  type OnboardingDraft,
} from "@/lib/onboarding/onboarding-types";

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-colors ${
        active
          ? "border-emerald-400 bg-emerald-600 text-white shadow-sm"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-emerald-200 hover:bg-emerald-50/60"
      }`}
    >
      {children}
    </button>
  );
}

const SOCIAL_FIELDS = [
  { key: "instagramUsername" as const, label: "Instagram", placeholder: "@username", accent: "from-rose-500 to-orange-400" },
  { key: "tiktokUsername" as const, label: "TikTok", placeholder: "@username", accent: "from-zinc-800 to-zinc-600" },
  { key: "youtubeChannel" as const, label: "YouTube", placeholder: "канал", accent: "from-red-600 to-red-500" },
];

type OnboardingWorkspaceStepProps = {
  draft: OnboardingDraft;
  onChange: (draft: OnboardingDraft) => void;
  titleId: string;
};

export const OnboardingWorkspaceStep = memo(function OnboardingWorkspaceStep({
  draft,
  onChange,
  titleId,
}: OnboardingWorkspaceStepProps) {
  return (
    <div className="onboarding-workspace">
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Ваше пространство</p>
        <h2 id={titleId} className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 md:text-2xl">
          Настройте профиль
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Это поможет сразу показывать более подходящие идеи, тренды и рекомендации именно для вашей ниши.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Соцсети</h3>
          <div className="mt-3 space-y-3">
            {SOCIAL_FIELDS.map((field) => (
              <label key={field.key} className="block">
                <span className="mb-1.5 flex items-center gap-2 text-xs font-medium text-zinc-700">
                  <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${field.accent}`} />
                  {field.label}
                </span>
                <input
                  value={draft[field.key]}
                  onChange={(e) => onChange({ ...draft, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
                />
              </label>
            ))}
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Кто вы?</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {CREATOR_TYPE_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  active={draft.creatorType === opt}
                  onClick={() =>
                    onChange({ ...draft, creatorType: draft.creatorType === opt ? "" : opt })
                  }
                >
                  {opt}
                </Chip>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200/80 bg-white p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Ниша контента</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {CONTENT_NICHE_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  active={draft.contentNiches.includes(opt)}
                  onClick={() =>
                    onChange({
                      ...draft,
                      contentNiches: draft.contentNiches.includes(opt)
                        ? draft.contentNiches.filter((n) => n !== opt)
                        : [...draft.contentNiches, opt],
                    })
                  }
                >
                  {opt}
                </Chip>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
});
