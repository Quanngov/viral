import type { GridVideo } from "@/lib/mock-data";

/** Параметры запроса к `/api/videos/transcribe` из карточки (лента / сохранёнки / шпион). */
export function transcribeSearchParamsFromGridVideo(video: GridVideo): URLSearchParams {
  const p = new URLSearchParams();
  if (video.savedVideoDbId) p.set("savedVideoId", video.savedVideoDbId);
  else if (video.competitorVideoDbId) p.set("competitorVideoId", video.competitorVideoDbId);
  else p.set("videoId", video.id);
  return p;
}

export function transcribePostBodyFromGridVideo(video: GridVideo, force: boolean): string {
  if (video.savedVideoDbId) return JSON.stringify({ savedVideoId: video.savedVideoDbId, force });
  if (video.competitorVideoDbId) return JSON.stringify({ competitorVideoId: video.competitorVideoDbId, force });
  return JSON.stringify({ videoId: video.id, force });
}
