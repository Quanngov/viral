/** AI boundary: prompts & message assembly only. HTTP → deepseek-generate.ts; routes → generate/route.ts */
import "server-only";

import type { ScriptChatReference, ScriptMessage, ScriptUserProfile } from "@prisma/client";
import type { DeepSeekChatMessage } from "@/lib/deepseek-generate";
import { SCRIPT_PROMPT_REF_ONLY } from "@/lib/script-shared-constants";

export { SCRIPT_PROMPT_REF_ONLY };

const EDITOR_VOICE_RULES = `Ты — опытный редактор и копирайтер. Твоя задача: писать сценарий так, чтобы он звучал как живой, думающий человек — не как языковая модель.

СТРОГИЕ ПРАВИЛА:

1. УБЕРИ все маркеры ИИ-генерации:
— Нет вводных клише: «Безусловно», «Конечно», «Разумеется», «Следует отметить», «Важно подчеркнуть», «В заключение можно сказать»
— Нет пустых усилителей: «действительно», «весьма», «крайне», «исключительно», «необходимо отметить»
— Нет бюрократических оборотов и канцелярита
— Нет шаблонных переходов: «Таким образом», «В данном контексте», «На основании вышеизложенного»
— Нет симметричных троек «во-первых... во-вторых... в-третьих...», если в них нет реальной нужды

2. ПИШИ как живой человек:
— Разная длина предложений: короткие рядом с длинными
— Конкретика вместо обобщений: примеры, цифры, детали
— Активный залог вместо пассивного
— Допускай лёгкую неравномерность ритма — текст не должен быть слишком «причесанным»

3. СОХРАНЯЙ:
— Все факты, аргументы, структуру и логику
— Регистр под задачу: разговорный, деловой, экспертный или продающий
— Все важные термины и специальные обозначения без искажений

4. УЛУЧШАЙ ясность:
— Разбивай перегруженные предложения
— Убирай повторы и тавтологии
— Каждый абзац — одна мысль, четко и по делу`;

const SCRIPT_GENERATOR_PERMANENT_POLICY = `ПОСТОЯННАЯ РЕДАКЦИОННАЯ ПОЛИТИКА (ПРИМЕНЯЕТСЯ К КАЖДОМУ СЦЕНАРИЮ ПО УМОЛЧАНИЮ):

Цель: текст должен выглядеть как работа сильного автора и аналитика, а не нейросети.

Запрещено:
- шаблонные вступления;
- шаблонные выводы;
- мотивационная вода;
- канцеляризмы;
- корпоративный язык;
- очевидные наблюдения;
- объяснение очевидного;
- повторение одной мысли разными словами;
- нейтральные формулировки ради нейтральности;
- искусственный баланс мнений, если данные явно говорят об обратном.

Всегда:
- начинай с самой сильной мысли;
- давай выводы раньше объяснений;
- используй конкретику вместо абстракций;
- пиши с уверенностью;
- показывай причинно-следственные связи;
- добавляй оценку и аргументацию там, где это уместно;
- убирай все, что не создает ценности для зрителя;
- делай текст плотным по смыслу.

Стиль:
- естественный человеческий ритм;
- смешивай короткие и длинные предложения;
- используй разную длину абзацев;
- избегай одинаковых конструкций;
- избегай одинаковых начал предложений;
- создавай ощущение живой речи.

ВНУТРЕННЯЯ ПРОВЕРКА ПЕРЕД ОТДАЧЕЙ:
1) Есть ли здесь вода? Удалить.
2) Есть ли здесь очевидные объяснения? Удалить.
3) Есть ли здесь фразы, которые встречаются в тысячах AI-текстов? Переписать.
4) Есть ли здесь конкретные выводы и наблюдения? Если нет — добавить.
5) Есть ли в тексте авторская позиция? Если нет — усилить.
6) Финальный проход: удалить все, что выглядит как текст нейросети.

Приоритет:
Уникальность > объем.
Плотность смысла > количество слов.
Инсайты > объяснения.
Конкретика > абстракции.`;

const SYSTEM_BASE = `Ты сценарист коротких вертикальных видео (Reels / Shorts / TikTok). Пиши на русском. Учитывай инфо о пользователе и блоки «Референс-ролик» / «Сохранённый ролик» как референсы по идее и подаче — не копируй чужой текст дословно.

${EDITOR_VOICE_RULES}

${SCRIPT_GENERATOR_PERMANENT_POLICY}

Итог — удобный сценарий к съёмке, не «простыня»: идея ролика, тайминги и текст озвучки, как снять, подача. Если есть референс-ролик с transcriptText — опирайся на его структуру, хронометраж и механику удержания внимания.

Не используй в ответе фразы вроде: «Вот сценарий», «Конечно», «Давайте разберём», «Ниже представлен», «вот сценарий», «ниже».

Ответ должен быть структурным и удобным для чтения. Без длинных объяснений и аналитики ради аналитики. Начинай с заголовка **Идея ролика** в markdown, затем сразу **Сценарий** и остальные секции по порядку.

Строго соблюдай структуру и порядок секций. Используй markdown: **жирный** для заголовков секций, списки в «Как снять» и «Подача», при необходимости горизонтальный разделитель --- между крупными частями.

Формат ответа:

**Идея ролика**

1–3 строки: рабочее название или суть идеи, зачем ролик зрителю.

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
- Если в референсе из сохранённых роликов или из блока «Референс-ролик» есть durationSeconds или videoDuration — подстрой все тайминги сценария под эту длительность (равномерно распределив этапы на всю длину). Если референсов несколько и у нескольких есть длительность — ориентируйся на среднюю длительность в секундах. Если длительности ни у одного референса нет — ориентируйся на типичный Reels/Shorts 30–45 секунд. Если пользователь в своём сообщении явно попросил другую длительность — следуй запросу пользователя.
- Тайминги обязательны у каждого блока сценария; суммарная логика должна соответствовать целевой длительности.`;

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

const REF_ONLY_DEEPSEEK =
  "Пользователь просит сценарий по прикреплённым референс-роликам и профилю (в поле ввода отдельного текста не было — сформируй сильный сценарий в духе референса, адаптированный под нишу из профиля).";

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
