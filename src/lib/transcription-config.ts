import { getActionTokenCost } from "@/lib/billing/billing.config";

/** Стоимость транскрибации (внутренние токены кошелька). */
export function getTranscriptionTokenCost(): number {
  return getActionTokenCost("TRANSCRIBE");
}

export function getGroqWhisperModel(): string {
  const m = process.env.GROQ_WHISPER_MODEL?.trim();
  return m || "whisper-large-v3-turbo";
}
