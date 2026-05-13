"use client";

import { memo, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import type { GridVideo } from "@/lib/mock-data";
import { PlatformIcon } from "@/components/dashboard/PlatformIcon";
import { SaveBookmarkButton } from "@/components/dashboard/SaveBookmarkButton";
import { VideoDetailTranscript } from "@/components/dashboard/VideoDetailTranscript";
import { MockScriptGeneratorModal, MockSimpleInfoModal } from "@/components/dashboard/mock-dashboard-panels";
import { formatMetricCount } from "@/lib/format-metrics";
import { useSavedVideos } from "@/components/dashboard/SavedVideosContext";
import type { DashboardView } from "@/components/dashboard/UserPanel";

type VideoDetailPanelProps = {
  video: GridVideo | null;
  activeView?: DashboardView;
  onClose: () => void;
};

function resolvePlatform(video: GridVideo): "youtube" | "instagram" | "tiktok" {
  if (video.platform === "tiktok" || video.id.startsWith("tiktok:")) return "tiktok";
  if (video.platform === "instagram" || video.id.startsWith("instagram:")) return "instagram";
  if (video.platform === "youtube" || video.id.startsWith("youtube:")) return "youtube";
  const u = (video.url ?? "").toLowerCase();
  if (u.includes("instagram")) return "instagram";
  if (u.includes("tiktok")) return "tiktok";
  return "youtube";
}

export const VideoDetailPanel = memo(function VideoDetailPanel({ video, activeView, onClose }: VideoDetailPanelProps) {
  const { isSaved } = useSavedVideos();
  const [playInModal, setPlayInModal] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [analyzeModalOpen, setAnalyzeModalOpen] = useState(false);
  const [contentPlanModalOpen, setContentPlanModalOpen] = useState(false);

  useEffect(() => {
    if (!video || activeView !== "saved") return;
    if (!isSaved(video.id)) onClose();
  }, [video, activeView, isSaved, onClose]);

  useEffect(() => {
    if (!video) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [video, onClose]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- сброс плеера при смене ролика
    setPlayInModal(false);
    setIsDescriptionOpen(false);
  }, [video?.id]);

  if (!video) return null;

  const platform = resolvePlatform(video);
  const youtubeId =
    video.youtubeId ?? (video.id.startsWith("youtube:") ? video.id.slice("youtube:".length) : null);
  const canEmbedYoutube = platform === "youtube" && Boolean(youtubeId);
  const embedUrl = canEmbedYoutube ? `https://www.youtube.com/embed/${youtubeId}` : "";
  const canPlayMp4 = Boolean(video.videoUrl?.trim());

  const thumbIsIg =
    platform === "instagram" ||
    platform === "tiktok" ||
    (video.thumbnailUrl?.includes("cdninstagram") ?? false) ||
    (video.thumbnailUrl?.includes("fbcdn.net") ?? false);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6">
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
      />

      <section
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-[94vw] max-w-[1100px] rounded-3xl bg-white p-6 shadow-xl shadow-zinc-900/20 md:w-[60vw]"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="line-clamp-2 pr-2 text-lg font-semibold leading-snug tracking-tight text-zinc-900 md:text-xl">
            {video.title}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <SaveBookmarkButton
              variant="detail"
              video={video}
              sourceType={video.savedFrom?.sourceType ?? "feed"}
              sourceId={video.savedFrom?.sourceId ?? null}
            />
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-zinc-100 p-2 text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
              aria-label="Закрыть"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-4 max-h-[85vh] overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.42fr_0.58fr]">
            <div>
              <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-zinc-900/5">
                {playInModal && canPlayMp4 ? (
                  <video
                    src={video.videoUrl!}
                    controls
                    className="h-full w-full object-contain bg-black"
                    playsInline
                  >
                    <track kind="captions" />
                  </video>
                ) : playInModal && canEmbedYoutube ? (
                  <iframe
                    src={embedUrl}
                    title={video.title}
                    className="h-full w-full"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <>
                    {thumbIsIg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Image
                        src={video.thumbnailUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="420px"
                        loading="lazy"
                      />
                    )}
                    {canPlayMp4 || canEmbedYoutube ? (
                      <button
                        type="button"
                        onClick={() => setPlayInModal(true)}
                        className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/35"
                        aria-label="Воспроизвести ролик"
                      >
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-emerald-700 shadow-lg">
                          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </button>
                    ) : null}
                  </>
                )}
              </div>

              {video.url ? (
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-colors hover:bg-emerald-700"
                >
                  Открыть на площадке
                </a>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <StatCell k="Просмотры" v={video.views} />
                <StatCell k="Лайки" v={video.likes} />
                <StatCell
                  k="Комментарии"
                  v={typeof video.comments === "number" ? formatMetricCount(video.comments) : "—"}
                />
                <StatCell
                  k="Репосты"
                  v={typeof video.shares === "number" ? formatMetricCount(video.shares) : "—"}
                />
                <StatCell k="Дата публикации" v={video.publishedAt} />
                <StatCell
                  k="Платформа"
                  v={
                    <span className="inline-flex items-center gap-1.5">
                      <PlatformIcon platform={platform} size={16} />
                      <span className="sr-only">
                        {platform === "youtube" ? "YouTube" : platform === "tiktok" ? "TikTok" : "Instagram"}
                      </span>
                    </span>
                  }
                />
              </div>
            </div>

            <div>
              <VideoDetailTranscript video={video} onClose={onClose} />

              <div className="mt-3 rounded-2xl border border-zinc-200 bg-white">
                <button
                  type="button"
                  onClick={() => setIsDescriptionOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-zinc-900">Описание</span>
                  <svg
                    className={`h-4 w-4 text-zinc-500 transition-transform ${isDescriptionOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {isDescriptionOpen ? (
                  <div className="border-t border-zinc-100 px-4 py-3">
                    <p className="text-sm leading-relaxed text-zinc-600">
                      {video.description?.trim() || "Описание отсутствует"}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAnalyzeModalOpen(true)}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                >
                  Анализировать
                </button>
                <button
                  type="button"
                  onClick={() => setScriptModalOpen(true)}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                >
                  Сценарий
                </button>
                <button
                  type="button"
                  onClick={() => setContentPlanModalOpen(true)}
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-colors hover:bg-emerald-700"
                >
                  В контент-план
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MockScriptGeneratorModal open={scriptModalOpen} onClose={() => setScriptModalOpen(false)} video={video} />
      <MockSimpleInfoModal
        open={analyzeModalOpen}
        onClose={() => setAnalyzeModalOpen(false)}
        title="Анализ ролика"
        body="Демо-режим: AI-анализ метрик и структуры ролика не запускается. Используйте «Сценарий» для макета генерации сценария."
      />
      <MockSimpleInfoModal
        open={contentPlanModalOpen}
        onClose={() => setContentPlanModalOpen(false)}
        title="Контент-план"
        body="Демо-режим: добавление в календарь публикаций пока не реализовано. Сохранение ролика в «Сохранённые» работает как раньше."
      />
    </div>
  );
});

function StatCell({ k, v, mono }: { k: string; v: string | ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{k}</p>
      <div className={`mt-0.5 text-sm text-zinc-900 ${mono ? "font-mono text-xs break-all" : "tabular-nums"}`}>
        {v}
      </div>
    </div>
  );
}
