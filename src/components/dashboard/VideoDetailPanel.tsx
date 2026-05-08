"use client";

import { useEffect } from "react";
import Image from "next/image";
import type { GridVideo } from "@/lib/mock-data";

type VideoDetailPanelProps = {
  video: GridVideo | null;
  onClose: () => void;
};

export function VideoDetailPanel({ video, onClose }: VideoDetailPanelProps) {
  useEffect(() => {
    if (!video) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [video]);

  if (!video) return null;

  const scoreDisplay = video.score ?? video.rating;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl shadow-zinc-900/15 transition-transform duration-200 ease-out">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Карточка ролика
            </p>
            <h2 className="mt-1 text-lg font-semibold leading-snug tracking-tight text-zinc-900">
              {video.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 p-2 text-zinc-500 transition-colors hover:border-emerald-300 hover:text-emerald-800"
            aria-label="Закрыть панель"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-900/5">
            <Image src={video.thumbnailUrl} alt="" fill className="object-cover" sizes="400px" />
          </div>

          <dl className="mt-4 space-y-3 text-sm text-zinc-800">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Канал</dt>
              <dd className="mt-0.5 font-medium">{video.channel}</dd>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Просмотры</dt>
                <dd className="mt-0.5 tabular-nums">{video.views}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Лайки</dt>
                <dd className="mt-0.5 tabular-nums">{video.likes}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Комментарии</dt>
                <dd className="mt-0.5 tabular-nums">{video.comments ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Опубликовано</dt>
                <dd className="mt-0.5">{video.publishedAt}</dd>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Score</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-emerald-800">{scoreDisplay}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Viral score</dt>
                <dd className="mt-0.5 tabular-nums">{video.viralScore}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Просм./ч</dt>
                <dd className="mt-0.5 tabular-nums">{video.viewsPerHour != null ? video.viewsPerHour : "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Engagement</dt>
                <dd className="mt-0.5 tabular-nums">
                  {video.engagementRate != null ? `${(video.engagementRate * 100).toFixed(2)}%` : "—"}
                </dd>
              </div>
            </div>
            {video.url ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Ссылка</dt>
                <dd className="mt-0.5 break-all">
                  <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline decoration-emerald-700/30 underline-offset-2 hover:text-emerald-900">
                    {video.url}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>

          {video.summary ? (
            <p className="mt-4 text-sm leading-relaxed text-zinc-600">{video.summary}</p>
          ) : null}

          {video.url ? (
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-colors hover:bg-emerald-700"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
              Посмотреть ролик
            </a>
          ) : (
            <p className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 py-3 text-center text-sm text-zinc-500">
              Ссылка на ролик недоступна
            </p>
          )}

          <p className="mt-6 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Инструменты для этого ролика
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2">
            <button
              type="button"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-left text-sm font-medium text-zinc-800 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
            >
              Глубокий анализ
            </button>
            <button
              type="button"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-left text-sm font-medium text-zinc-800 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
            >
              Сгенерировать сценарий
            </button>
            <button
              type="button"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-left text-sm font-medium text-zinc-800 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
            >
              Добавить в избранное
            </button>
            <button
              type="button"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-left text-sm font-medium text-zinc-800 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
            >
              Открыть в контент-радаре
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
