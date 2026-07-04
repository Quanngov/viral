"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GridVideo } from "@/lib/mock-data";
import { transcribePostBodyFromGridVideo, transcribeSearchParamsFromGridVideo } from "@/components/dashboard/video-transcribe-client";
import { useToast } from "@/components/dashboard/ToastContext";
import { useAuthGateOptional } from "@/components/dashboard/AuthGateProvider";
import { messageForHttpStatus, sanitizeClientErrorMessage } from "@/lib/api-user-messages";

/** Совпадает с текстом в `api/videos/transcribe` для YouTube без субтитров. */
const YT_TRANSCRIBE_UNAVAILABLE_HINT = "Для YouTube-ролика пока нет распознавания без субтитров.";

/** Совпадает с дефолтом `getTranscriptionTokenCost` на сервере. */
const TRANSCRIPTION_UI_COST = 5;

type TranscribeGetResponse = {
  videoId?: string;
  platform?: string;
  transcriptStatus?: string | null;
  transcriptText?: string | null;
  transcriptSource?: string | null;
  transcriptLanguage?: string | null;
  canTranscribe?: boolean;
  error?: string;
  message?: string;
};

type TranscribePostResponse = TranscribeGetResponse & {
  cached?: boolean;
  balance?: number;
};

function TokenSpark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13.75 2.75 6.5 13h4.75L10.25 21.25 17.5 11h-4.75l1-8.25Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VideoDetailTranscript({ video, onClose }: { video: GridVideo; onClose: () => void }) {
  const router = useRouter();
  const { showToast } = useToast();
  const authGate = useAuthGateOptional();
  const [hydrating, setHydrating] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transcriptStatus, setTranscriptStatus] = useState<string | null>(null);
  const [transcriptText, setTranscriptText] = useState<string | null>(null);
  const [transcriptSource, setTranscriptSource] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [canTranscribe, setCanTranscribe] = useState(true);

  const hydrate = useCallback(async () => {
    setHydrating(true);
    setPanelError(null);
    try {
      const qs = transcribeSearchParamsFromGridVideo(video).toString();
      const res = await fetch(`/api/videos/transcribe?${qs}`, { cache: "no-store" });
      const data = (await res.json()) as TranscribeGetResponse;
      if (res.status === 404) {
        setTranscriptStatus(null);
        setTranscriptText(null);
        setCanTranscribe(false);
        setPanelError(typeof data.message === "string" ? data.message : "Ролик не найден или нет доступа.");
        return;
      }
      if (!res.ok) {
        setPanelError(typeof data.message === "string" ? data.message : "Не удалось загрузить статус");
        return;
      }
      setTranscriptStatus(data.transcriptStatus ?? null);
      setTranscriptText(data.transcriptText ?? null);
      setTranscriptSource(data.transcriptSource ?? null);
      setCanTranscribe(data.canTranscribe !== false);
    } catch {
      setPanelError("Ошибка сети");
    } finally {
      setHydrating(false);
    }
  }, [video]);

  useEffect(() => {
    queueMicrotask(() => {
      void hydrate();
    });
  }, [hydrate]);

  useEffect(() => {
    if (transcriptStatus !== "processing" || hydrating) return;
    const id = window.setInterval(() => {
      void hydrate();
    }, 3500);
    return () => clearInterval(id);
  }, [transcriptStatus, hydrating, hydrate]);

  const onTranscribe = useCallback(async () => {
    if (authGate && !authGate.ensureRegistered("transcribe", () => onTranscribe())) return;
    setSubmitting(true);
    setPanelError(null);
    try {
      const res = await fetch("/api/videos/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: transcribePostBodyFromGridVideo(video, false),
      });
      const data = (await res.json()) as TranscribePostResponse;
      if (res.status === 409) {
        setTranscriptStatus("processing");
        setPanelError(null);
        return;
      }
      if (!res.ok) {
        if (res.status === 402) {
          showToast(messageForHttpStatus(402, data.message), "warn");
        }
        setPanelError(
          res.status === 402
            ? messageForHttpStatus(402, data.message)
            : sanitizeClientErrorMessage(
                typeof data.message === "string"
                  ? data.message
                  : data.error === "insufficient_tokens"
                    ? messageForHttpStatus(402)
                    : "",
              ) || "Ошибка транскрибации",
        );
        if (res.status === 422) {
          setCanTranscribe(false);
        }
        return;
      }
      setTranscriptStatus(data.transcriptStatus ?? "ready");
      setTranscriptText(data.transcriptText ?? null);
      setTranscriptSource(data.transcriptSource ?? null);
      if (data.transcriptText?.trim() && (data.transcriptStatus ?? "ready") === "ready") {
        showToast("Текст ролика получен", "ok");
      }
    } catch {
      setPanelError("Ошибка сети");
    } finally {
      setSubmitting(false);
    }
  }, [video, showToast, authGate]);

  const onUseInScript = useCallback(() => {
    try {
      const uname = video.authorUsername?.trim().replace(/^@/, "");
      const title = uname
        ? `Сценарий по @${uname}`
        : `Сценарий: ${(video.title || "ролик").trim().slice(0, 72)}`;
      const payload: Record<string, string> = { title };
      if (video.savedVideoDbId) payload.savedVideoId = video.savedVideoDbId;
      else if (video.competitorVideoDbId) payload.competitorVideoId = video.competitorVideoDbId;
      else payload.videoId = video.id;
      sessionStorage.setItem("viral_script_reference_intent", JSON.stringify(payload));
      window.dispatchEvent(new Event("viral-script-reference-intent"));
    } catch {
      /* ignore */
    }
    router.replace("/?tab=scripts");
    onClose();
  }, [video, router, onClose]);

  const busy = transcriptStatus === "processing";
  const showText = Boolean(transcriptText?.trim()) && transcriptStatus === "ready";
  const failed = transcriptStatus === "failed";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-900">Текст ролика</p>
        {showText && transcriptSource ? (
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 ring-1 ring-zinc-200">
            {transcriptSource === "subtitles" ? "Субтитры" : "Whisper"}
          </span>
        ) : null}
      </div>

      {panelError ? (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{panelError}</p>
      ) : null}

      {hydrating ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" aria-hidden />
          Загрузка…
        </div>
      ) : busy || submitting ? (
        <div className="mt-4 flex flex-col gap-2 text-sm text-zinc-600">
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" aria-hidden />
            {submitting ? "Получаем текст…" : "Транскрибация выполняется…"}
          </div>
          <p className="text-xs text-zinc-500">Обычно это занимает до минуты. Можно закрыть панель и открыть ролик снова позже.</p>
        </div>
      ) : showText ? (
        <div className="mt-3">
          <div className="scrollbar-hidden max-h-[min(50vh,320px)] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-3 text-sm leading-relaxed text-zinc-800">
            {transcriptText}
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {failed ? (
            <p className="text-xs text-zinc-500">Прошлая попытка не удалась. Можно попробовать снова.</p>
          ) : null}
          {!canTranscribe ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
              {video.platform === "youtube"
                ? YT_TRANSCRIBE_UNAVAILABLE_HINT
                : video.platform === "instagram"
                  ? "Нет ссылки на видео и субтитров для распознавания. Для Instagram нажмите «Получить текст» — попробуем подтянуть данные; если не получится, найдите ролик через поиск."
                  : "Нет ссылки на видео и субтитров для распознавания. Попробуйте другой ролик или обновите данные."}
            </p>
          ) : null}
          <button
            type="button"
            disabled={submitting || !canTranscribe}
            onClick={() => void onTranscribe()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <TokenSpark className="h-4 w-4 text-white/95" />
            <span className="tabular-nums">{TRANSCRIPTION_UI_COST}</span>
            <span>Получить текст</span>
          </button>
          <p className="text-center text-[11px] text-zinc-500">Списание токенов только при первом получении текста</p>
        </div>
      )}

      {!hydrating && !busy && !submitting && (showText || canTranscribe) ? (
        <div className="mt-3 border-t border-zinc-200 pt-3">
          <button
            type="button"
            onClick={onUseInScript}
            className="w-full rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-100"
          >
            Использовать в сценарии
          </button>
          {!showText ? (
            <p className="mt-1.5 text-center text-[11px] leading-relaxed text-zinc-500">
              Ролик откроется в генераторе как референс. После получения текста сценарий сможет учитывать транскрипт.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
