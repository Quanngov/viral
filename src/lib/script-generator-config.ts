import { getActionTokenCost } from "@/lib/billing/billing.config";

/** Стоимость одной генерации сценария (внутренние токены кошелька). */
export function getScriptGenerationTokenCost(): number {
  return getActionTokenCost("SCRIPT");
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
