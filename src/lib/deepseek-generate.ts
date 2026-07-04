/**
 * AI boundary: DeepSeek HTTP only. Prompts live in script-generator-prompt.ts.
 * Routes must not build prompts here.
 */
import { getDeepSeekEnv } from "@/lib/script-generator-config";
import { logAiEvent } from "@/lib/server-log";

export type DeepSeekChatRole = "system" | "user" | "assistant";

export type DeepSeekChatMessage = {
  role: DeepSeekChatRole;
  content: string;
};

export class DeepSeekError extends Error {
  constructor(
    message: string,
    public readonly kind: "missing_api_key" | "http" | "parse" | "empty" | "abort" | "unknown",
    public readonly status?: number,
  ) {
    super(message);
    this.name = "DeepSeekError";
  }
}

export async function deepseekChatCompletion(
  messages: DeepSeekChatMessage[],
  options?: { temperature?: number; max_tokens?: number },
): Promise<{
  text: string;
  promptTokens?: number;
  completionTokens?: number;
}> {
  const { apiKey, baseUrl, model } = getDeepSeekEnv();
  if (!apiKey) {
    throw new DeepSeekError("DEEPSEEK_API_KEY не задан", "missing_api_key");
  }

  const url = `${baseUrl}/v1/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.55,
        max_tokens: options?.max_tokens ?? 1800,
      }),
      signal: controller.signal,
    });

    const raw = await res.text();
    if (!res.ok) {
      throw new DeepSeekError(`DeepSeek HTTP ${res.status}`, "http", res.status);
    }

    let data: unknown;
    try {
      data = JSON.parse(raw) as unknown;
    } catch {
      throw new DeepSeekError("Некорректный JSON от DeepSeek", "parse");
    }

    const root = data as Record<string, unknown>;
    const choices = root.choices as unknown;
    if (!Array.isArray(choices) || choices.length === 0) {
      throw new DeepSeekError("Пустой ответ модели", "empty");
    }
    const msg = (choices[0] as Record<string, unknown>)?.message as Record<string, unknown> | undefined;
    const content = typeof msg?.content === "string" ? msg.content.trim() : "";
    if (!content) {
      throw new DeepSeekError("Пустой текст ответа", "empty");
    }

    const usage = root.usage as Record<string, unknown> | undefined;
    const promptTokens = typeof usage?.prompt_tokens === "number" ? usage.prompt_tokens : undefined;
    const completionTokens = typeof usage?.completion_tokens === "number" ? usage.completion_tokens : undefined;

    logAiEvent("deepseek_completion_ok", {
      ok: true,
      promptTokens,
      completionTokens,
    });
    return { text: content, promptTokens, completionTokens };
  } catch (e) {
    if (e instanceof DeepSeekError) {
      logAiEvent("deepseek_completion_fail", {
        ok: false,
        kind: e.kind,
        status: e.status,
        error: e,
      });
      throw e;
    }
    if (e instanceof Error && e.name === "AbortError") {
      throw new DeepSeekError("Таймаут запроса к DeepSeek", "abort");
    }
    throw new DeepSeekError(e instanceof Error ? e.message : "Ошибка запроса", "unknown");
  } finally {
    clearTimeout(timer);
  }
}
