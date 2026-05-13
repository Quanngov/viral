/** Стоимость одной генерации сценария (внутренние токены кошелька, не DeepSeek). */
export function getScriptGenerationTokenCost(): number {
  const raw = process.env.SCRIPT_GENERATION_TOKEN_COST?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 20;
  if (!Number.isFinite(n) || n < 1) return 20;
  return Math.min(n, 5000);
}

export function getDeepSeekEnv(): {
  apiKey: string;
  baseUrl: string;
  model: string;
} {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim() ?? "";
  const baseUrl = (process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com").replace(/\/$/, "");
  const model = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-v4-flash";
  return { apiKey, baseUrl, model };
}
