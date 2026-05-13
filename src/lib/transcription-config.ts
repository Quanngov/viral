/** Стоимость транскрибации (внутренние токены кошелька). */
export function getTranscriptionTokenCost(): number {
  const raw = process.env.TRANSCRIPTION_TOKEN_COST?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 5;
  if (!Number.isFinite(n) || n < 1) return 5;
  return Math.min(n, 5000);
}

export function getGroqWhisperModel(): string {
  const m = process.env.GROQ_WHISPER_MODEL?.trim();
  return m || "whisper-large-v3-turbo";
}
