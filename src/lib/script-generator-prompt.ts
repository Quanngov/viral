/** AI boundary: prompts & message assembly only. HTTP → deepseek-generate.ts; routes → generate/route.ts */
import "server-only";

import type { ScriptChatReference, ScriptMessage, ScriptUserProfile } from "@prisma/client";
import type { DeepSeekChatMessage } from "@/lib/deepseek-generate";
import { SCRIPT_PROMPT_REF_ONLY } from "@/lib/script-shared-constants";
import {
  REF_ONLY_USER_PROMPT,
  SCRIPT_SYSTEM_BASE,
} from "@/lib/admin/prompt-catalog";

export { SCRIPT_PROMPT_REF_ONLY };

const SYSTEM_BASE = SCRIPT_SYSTEM_BASE;

const MAX_SYSTEM = 14_000;

export function buildProfileSection(profile: ScriptUserProfile): string {
  const t = profile.profileText?.trim();
  if (t) {
    return `Инфо о пользователе:\n${t}`;
  }
  const lines = [
    profile.occupation.trim(),
    profile.targetAudience.trim(),
    profile.tone.trim(),
    profile.cta.trim(),
    profile.restrictions.trim(),
  ].filter(Boolean);
  if (lines.length === 0) {
    return "Инфо о пользователе: не указано.";
  }
  return [
    "Инфо о пользователе:",
    `- Чем вы занимаетесь: ${profile.occupation.trim() || "—"}`,
    `- Целевая аудитория: ${profile.targetAudience.trim() || "—"}`,
    `- Стиль подачи: ${profile.tone.trim() || "—"}`,
    `- Куда призываете в конце ролика: ${profile.cta.trim() || "—"}`,
    `- Что нельзя говорить / ограничения: ${profile.restrictions.trim() || "—"}`,
  ].join("\n");
}

export function aggregateImportSystems(messages: ScriptMessage[]): string {
  const parts = messages.filter((m) => m.role === "system" && m.savedVideoId).map((m) => m.content.trim());
  if (parts.length === 0) return "";
  const joined = parts.join("\n---\n");
  return joined.length > 3500 ? `${joined.slice(0, 3500)}…` : joined;
}

/** Текстовый блок референсов для системного промпта (с транскриптом из Video). */
export function buildReferencesPromptBlock(
  refs: (ScriptChatReference & {
    video: { transcriptText: string | null; transcriptSource: string | null; durationSeconds: number } | null;
  })[],
): string {
  const first = refs.slice(0, 1);
  if (first.length === 0) return "";
  const parts: string[] = [];
  for (const r of first) {
    const lines: string[] = [];
    lines.push(`[Референс-ролик] platform=${r.platform} externalId=${r.externalId}`);
    lines.push(`title: ${r.title}`);
    const author = r.authorDisplayName?.trim() || r.authorUsername?.trim();
    if (author) lines.push(`author: ${author}`);
    lines.push(`views: ${r.views}`);
    lines.push(`rating: ${r.rating}`);
    const dur = r.durationSeconds ?? r.video?.durationSeconds;
    if (dur != null && dur > 0) {
      lines.push(`durationSeconds: ${dur}`);
      lines.push(`videoDuration: ${dur}s`);
    }
    if (r.publishedAt) lines.push(`publishedAt: ${r.publishedAt.toISOString()}`);
    if (r.description?.trim()) {
      const d = r.description.trim().replace(/\s+/g, " ");
      lines.push(`caption: ${d.slice(0, 900)}${d.length > 900 ? "…" : ""}`);
    }
    lines.push(`url: ${r.url}`);
    const tt = r.video?.transcriptText?.trim();
    if (tt) {
      lines.push(`transcriptSource: ${r.video?.transcriptSource ?? r.transcriptSource ?? "unknown"}`);
      lines.push(`transcriptText:\n${tt}`);
    } else {
      lines.push(`transcriptText: (нет — ориентируйся на метаданные и caption)`);
    }
    parts.push(lines.join("\n"));
  }
  const joined = parts.join("\n\n---\n\n");
  const maxBlock = 200_000;
  return joined.length > maxBlock ? `${joined.slice(0, maxBlock)}…` : joined;
}

/** Подсказка по длительности из импортированных сообщений и блока референсов. */
export function buildReferenceDurationHint(messages: ScriptMessage[], referencesBlock?: string): string {
  const secs: number[] = [];
  for (const m of messages) {
    if (m.role !== "system" || !m.savedVideoId) continue;
    const match = m.content.match(/durationSeconds:\s*(\d+)/);
    if (match) {
      const n = Number.parseInt(match[1], 10);
      if (Number.isFinite(n) && n > 0) secs.push(n);
    }
  }
  if (referencesBlock) {
    for (const m of referencesBlock.matchAll(/durationSeconds:\s*(\d+)/g)) {
      const n = Number.parseInt(m[1], 10);
      if (Number.isFinite(n) && n > 0) secs.push(n);
    }
  }
  if (secs.length === 0) return "";
  const avg = Math.round(secs.reduce((a, b) => a + b, 0) / secs.length);
  return `\n\nОриентир длительности по референсам: средняя ${avg} с (${secs.length} рол.). Подстрой тайминги сценария под эту длительность. Если у части роликов длительность не указана — используй только те, где она есть, для среднего; если есть только одна — используй её.`;
}

const REF_ONLY_DEEPSEEK = REF_ONLY_USER_PROMPT;

/** Последние user|assistant сообщения (макс. 8), по времени. */
export function pickRecentUserAssistantWindow(messages: ScriptMessage[], max = 8): DeepSeekChatMessage[] {
  const ua = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return ua.slice(-max).map((m) => ({
    role: m.role as "user" | "assistant",
    content:
      m.role === "user" && m.content === SCRIPT_PROMPT_REF_ONLY
        ? REF_ONLY_DEEPSEEK
        : m.content.length > 12_000
          ? `${m.content.slice(0, 12_000)}…`
          : m.content,
  }));
}

export function buildSystemPrompt(profile: ScriptUserProfile, importBlock: string, durationHint: string): string {
  const profileBlock = buildProfileSection(profile);
  let body = `${SYSTEM_BASE}\n\n${profileBlock}`;
  if (importBlock.trim()) {
    body += `\n\nРеференсы (компактно, для модели):\n${importBlock}`;
  }
  if (durationHint.trim()) {
    body += durationHint;
  }
  return body.length > MAX_SYSTEM ? `${body.slice(0, MAX_SYSTEM)}…` : body;
}

export function buildDeepSeekMessages(
  profile: ScriptUserProfile,
  allMessages: ScriptMessage[],
  referencesPrompt?: string,
): DeepSeekChatMessage[] {
  const refBlock = referencesPrompt?.trim() ?? "";
  const importBlock = aggregateImportSystems(allMessages);
  const combined = [refBlock, importBlock].filter(Boolean).join("\n\n---\n\n");
  const durationHint = buildReferenceDurationHint(allMessages, refBlock);
  const system = buildSystemPrompt(profile, combined, durationHint);
  const window = pickRecentUserAssistantWindow(allMessages, 8);
  return [{ role: "system", content: system }, ...window];
}
