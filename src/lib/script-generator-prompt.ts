import type { ScriptMessage, ScriptUserProfile } from "@prisma/client";
import type { DeepSeekChatMessage } from "@/lib/deepseek-generate";

const SYSTEM_BASE = `Ты сценарист коротких вертикальных видео (Reels / Shorts / TikTok). Пиши на русском: живой язык, без канцелярита. Учитывай инфо о пользователе и блоки «Сохранённый ролик» как референсы по идее и подаче — не копируй чужой текст дословно.

Ответ должен быть коротким, структурным и удобным для чтения. Без длинных объяснений, без аналитики ради аналитики, без вступлений («вот сценарий», «ниже» и т.п.). Сразу начинай с заголовка **Сценарий** в markdown.

Строго соблюдай структуру и порядок секций. Используй markdown: **жирный** для заголовков трёх секций, списки в «Как снять» и «Подача», при необходимости горизонтальный разделитель --- между крупными частями.

Формат ответа:

**Сценарий**

Далее несколько строк с таймингами и готовым текстом для озвучки. Каждый блок:
«0:00–0:03 — хук» (подставь реальные тайминги под целевую длительность)
пустая строка
[текст озвучки — готовый к прочтению, без воды]

Обязательные по смыслу этапы (названия этапов сохраняй, тайминги подбери под длительность):
- хук
- раскрытие
- основная мысль
- усиление / пример
- CTA

Если длительность очень короткая, этапы можно слегка сжать в меньшее число тайм-блоков, но смысл этапов не теряй. Если длинная — добавь 1–2 промежуточных тайм-блока, не раздувая текст.

**Как снять**

- короткие конкретные рекомендации по кадрам;
- где крупный план;
- где b-roll;
- где текст на экране;
- что показать руками / экраном / примером.

**Подача**

- 3–5 коротких советов по интонации, темпу, эмоции и удержанию внимания.

Правила длительности и таймингов:
- Если в референсе из сохранённых роликов есть durationSeconds или videoDuration — подстрой все тайминги сценария под эту длительность (равномерно распределив этапы на всю длину). Если референсов несколько и у нескольких есть длительность — ориентируйся на среднюю длительность в секундах. Если длительности ни у одного референса нет — ориентируйся на типичный Reels/Shorts 30–45 секунд. Если пользователь в своём сообщении явно попросил другую длительность — следуй запросу пользователя.
- Тайминги обязательны у каждого блока сценария; суммарная логика должна соответствовать целевой длительности.`;

const MAX_SYSTEM = 8000;

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

/** Подсказка по длительности из импортированных сообщений (строки с durationSeconds). */
export function buildReferenceDurationHint(messages: ScriptMessage[]): string {
  const secs: number[] = [];
  for (const m of messages) {
    if (m.role !== "system" || !m.savedVideoId) continue;
    const match = m.content.match(/durationSeconds:\s*(\d+)/);
    if (match) {
      const n = Number.parseInt(match[1], 10);
      if (Number.isFinite(n) && n > 0) secs.push(n);
    }
  }
  if (secs.length === 0) return "";
  const avg = Math.round(secs.reduce((a, b) => a + b, 0) / secs.length);
  return `\n\nОриентир длительности по референсам: средняя ${avg} с (${secs.length} рол.). Подстрой тайминги сценария под эту длительность. Если у части роликов длительность не указана — используй только те, где она есть, для среднего; если есть только одна — используй её.`;
}

/** Последние user|assistant сообщения (макс. 8), по времени. */
export function pickRecentUserAssistantWindow(messages: ScriptMessage[], max = 8): DeepSeekChatMessage[] {
  const ua = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return ua.slice(-max).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content.length > 12000 ? `${m.content.slice(0, 12000)}…` : m.content,
  }));
}

export function buildSystemPrompt(profile: ScriptUserProfile, importBlock: string, durationHint: string): string {
  const profileBlock = buildProfileSection(profile);
  let body = `${SYSTEM_BASE}\n\n${profileBlock}`;
  if (importBlock.trim()) {
    body += `\n\nИмпортированные ролики (компактно, как референсы):\n${importBlock}`;
  }
  if (durationHint.trim()) {
    body += durationHint;
  }
  return body.length > MAX_SYSTEM ? `${body.slice(0, MAX_SYSTEM)}…` : body;
}

export function buildDeepSeekMessages(
  profile: ScriptUserProfile,
  allMessages: ScriptMessage[],
): DeepSeekChatMessage[] {
  const importBlock = aggregateImportSystems(allMessages);
  const durationHint = buildReferenceDurationHint(allMessages);
  const system = buildSystemPrompt(profile, importBlock, durationHint);
  const window = pickRecentUserAssistantWindow(allMessages, 8);
  return [{ role: "system", content: system }, ...window];
}
