/** Короткие пользовательские тексты; в логах оставляем технические детали. */

export const USER_MSG = {
  tokensInsufficient: "Не хватает токенов для этого действия.",
  tikhubTimeout: "Instagram долго не отвечает. Попробуйте еще раз позже.",
  tikhubKeyMissing: "Instagram-поиск временно недоступен: не задан TikHub API ключ.",
  youtubeKeyMissing: "YouTube-поиск временно недоступен: не задан YouTube API ключ.",
  deepseekKeyMissing: "Генерация сценариев временно недоступна: не задан DeepSeek API ключ.",
  groqKeyMissing: "Транскрибация временно недоступна: не задан Groq API ключ.",
  loadFailed: "Не удалось загрузить данные. Попробуйте еще раз",
} as const;

/** Не показывать пользователю сырой stack / JSON из неизвестных ошибок. */
export function sanitizeClientErrorMessage(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return USER_MSG.loadFailed;
  if (s.length > 280) return USER_MSG.loadFailed;
  if (/^\s*\{/.test(s) || /\[object Object\]/.test(s)) return USER_MSG.loadFailed;
  if (/at\s+\w+\s*\(/.test(s) && s.includes(".ts")) return USER_MSG.loadFailed;
  return s;
}

export function messageForHttpStatus(status: number, bodyMessage?: string): string {
  if (status === 402) return USER_MSG.tokensInsufficient;
  return sanitizeClientErrorMessage(bodyMessage);
}
