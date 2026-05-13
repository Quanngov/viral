const GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export type GroqVerboseSegment = { start?: number; end?: number; text?: string };

export type GroqTranscriptionResult = {
  text: string;
  language?: string;
  duration?: number;
  segments: GroqVerboseSegment[];
};

function pickText(parsed: Record<string, unknown>): string {
  const t = parsed.text;
  return typeof t === "string" ? t.trim() : "";
}

function pickSegments(parsed: Record<string, unknown>): GroqVerboseSegment[] {
  const segs = parsed.segments;
  if (!Array.isArray(segs)) return [];
  const out: GroqVerboseSegment[] = [];
  for (const s of segs.slice(0, 120)) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    out.push({
      start: typeof o.start === "number" ? o.start : undefined,
      end: typeof o.end === "number" ? o.end : undefined,
      text: typeof o.text === "string" ? o.text : undefined,
    });
  }
  return out;
}

export async function groqTranscribeFromUrl(params: {
  apiKey: string;
  model: string;
  audioUrl: string;
  language?: string;
  signal?: AbortSignal;
}): Promise<GroqTranscriptionResult> {
  const form = new FormData();
  form.set("model", params.model);
  form.set("url", params.audioUrl);
  form.set("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  if (params.language) form.set("language", params.language);

  const res = await fetch(GROQ_TRANSCRIBE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${params.apiKey}` },
    body: form,
    signal: params.signal,
  });

  const rawText = await res.text();
  if (!res.ok) {
    const snippet = rawText.slice(0, 400);
    throw new Error(`groq_http_${res.status}: ${snippet}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    throw new Error("groq_invalid_json");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("groq_empty_response");

  const obj = parsed as Record<string, unknown>;
  const text = pickText(obj);
  const segments = pickSegments(obj);
  const language = typeof obj.language === "string" ? obj.language : undefined;
  const duration = typeof obj.duration === "number" ? obj.duration : undefined;

  return { text, language, duration, segments };
}

/** Ужимает JSON для Prisma (без огромных полей). */
export function compactTranscriptJsonForDb(input: GroqTranscriptionResult): Record<string, unknown> {
  return {
    text: input.text.slice(0, 120_000),
    language: input.language ?? null,
    duration: input.duration ?? null,
    segments: input.segments.map((s) => ({
      start: s.start,
      end: s.end,
      text: (s.text ?? "").slice(0, 800),
    })),
    source: "groq_whisper",
  };
}
