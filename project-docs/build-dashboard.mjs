#!/usr/bin/env node
/**
 * Единый дэшборд Viral: project-docs + pricing.
 * Запуск: node project-docs/build-dashboard.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PRICING = join(ROOT, "pricing");

function read(path) {
  return readFileSync(path, "utf8");
}

function extractSection(md, startHeading, endHeading) {
  const start = md.indexOf(startHeading);
  if (start === -1) return "";
  if (!endHeading) return md.slice(start);
  const end = md.indexOf(endHeading, start + startHeading.length);
  if (end === -1) return md.slice(start);
  return md.slice(start, end).trim();
}

function stripTemplate(md) {
  const idx = md.indexOf("## Template for future entries");
  const ru = md.indexOf("## Шаблон для будущих записей");
  const cut = idx >= 0 ? idx : ru >= 0 ? ru : -1;
  return cut >= 0 ? md.slice(0, cut).trim() : md.trim();
}

// --- Source files ---
const overview = read(join(ROOT, "00-project-overview.md"));
const architecture = read(join(ROOT, "01-architecture.md"));
const changes = read(join(ROOT, "02-change-log.md"));
const aiPrompts = read(join(ROOT, "03-ai-prompts.md"));
const integrations = read(join(ROOT, "04-services-and-integrations.md"));
const decisions = read(join(ROOT, "05-known-decisions.md"));
const audits = read(join(ROOT, "06-audits.md"));
const roadmap = read(join(ROOT, "07-roadmap.md"));

const pricingOverview = read(join(PRICING, "pricing-overview.md"));
const unitEconomics = read(join(PRICING, "unit-economics.md"));
const userGrowth = read(join(PRICING, "user-growth-model.md"));
const pricingRoadmap = read(join(PRICING, "pricing-roadmap.md"));
const featureCosts = read(join(PRICING, "feature-costs.md"));

// --- Brief sections (RU, без дублирования detailed) ---

const overviewBrief = `# Обзор проекта

**Viral** — дашборд для блогеров и агентств: поиск YouTube Shorts и Instagram Reels, шпион конкурентов, сохранения, тренды, генерация сценариев через DeepSeek.

| Компонент | Значение |
|-----------|----------|
| Runtime | Next.js 16 (App Router), React 19, TypeScript |
| База | PostgreSQL (Supabase), Prisma 6 |
| Auth | NextAuth v5 + \`SessionUser\` + cookie-мост |
| Монетизация | Внутренний кошелёк токенов (\`UserTokenBalance\`) |
| API routes | 34 обработчика в \`src/app/api/**\` |

## Основные потоки

1. **Поиск** — \`SearchResultsSection\` → \`POST /api/videos/feed\`
2. **Конкуренты** — \`CompetitorSpySection\` → \`/api/competitors/*\`
3. **Сохранения** — \`/api/saved-videos\`
4. **Сценарии** — \`/api/script-generator/*\` + DeepSeek
5. **Тренды** — poll \`GET /api/trends/realtime\`

## Активные интеграции

| Сервис | Роль |
|--------|------|
| Supabase / Vercel | БД + хостинг |
| YouTube Data API | Shorts |
| TikHub | Instagram Reels |
| DeepSeek | Сценарии |
| Groq | Транскрибация (fallback) |
| Sentry | Ошибки |

> Биллинг в UI — демо. Документация по тарифам — раздел **Бизнес**.`;

const billingMonetization = read(join(ROOT, "billing-monetization.md"));

const businessBrief =
  extractSection(billingMonetization, "# Billing & Monetization", "## Ledger") +
  "\n\n" +
  extractSection(unitEconomics, "## 5. Рекомендуемые тарифы", "## 6. Масштаб") +
  "\n\n" +
  extractSection(unitEconomics, "## 4. Worst-case analysis", "## 5. Рекомендуемые тарифы") +
  "\n\n" +
  extractSection(unitEconomics, "## 6. Масштаб", "## 7. Расхождения") +
  "\n\n" +
  extractSection(unitEconomics, "## 8. Если запускать оплату завтра", "## Источники") +
  "\n\n" +
  extractSection(pricingOverview, "## Сравнительная матрица функций", "## Списания токенов");

const architectureBrief = `# Архитектура (кратко)

${extractSection(architecture, "## Layers", "## Dashboard composition")}

## Auth

- NextAuth (Google + credentials) + app \`SessionUser\`
- \`ensureSessionUser()\` — единая точка входа API
- Один Prisma engine: \`getPrismaBase()\` + \`$extends\` (не два пула)

## Feed pipeline

${extractSection(architecture, "## Feed / search pipeline", "## Trends pipeline")}

## Риски архитектуры

- Ingest синхронно в HTTP (\`feed/route.ts\`)
- ~70% routes без \`withApiRoute\`
- UI-монолиты: ScriptGenerator, CompetitorSpy (~1k строк)`;

const aiBrief = `# AI (кратко)

${extractSection(aiPrompts, "## Stack", "## Environment")}

## Поток генерации

${extractSection(aiPrompts, "## Request flow", "## Prompt policy")}

## Политика промпта (суть)

${extractSection(aiPrompts, "## Prompt policy (summary)", "## Client/server boundary")}

## Заметки

${extractSection(aiPrompts, "## Operational notes", "")}`;

const historyBrief = `# История (кратко)

${extractSection(changes, "## 2026-05-30 — External search", "---")}

---

${extractSection(changes, "## 2026-05-30 — Documentation", "---")}

---

${extractSection(changes, "## 2026-05-30 — Project knowledge base", "---")}`;

const problemsBrief = `# Проблемы и план (кратко)

${extractSection(audits, "## Executive verdict", "## Highest-complexity")}

${extractSection(audits, "## Focused audit — issues & status", "## Prisma dual-client")}

## Roadmap — следующие 30 дней (P0–P1)

${extractSection(roadmap, "## Next 30 days", "## Backlog")}

## Мониторить в проде

${extractSection(audits, "## Monitor in production", "## Canonical")}`;

// --- Detailed (полные документы, без повторения brief-блоков) ---

const overviewDetailed =
  overview.replace(/## Viewing the knowledge dashboard[\s\S]*$/m, "").trim() +
  "\n\n---\n\n" +
  integrations;

const featureCostsBeforeTokens = featureCosts.split("# Токеномика")[0].trim();
const featureCostsTokens = featureCosts.includes("# Токеномика")
  ? "# Токеномика" + featureCosts.split("# Токеномика").slice(1).join("# Токеномика")
  : "";

const businessDetailed =
  billingMonetization +
  "\n\n---\n\n" +
  pricingOverview +
  "\n\n---\n\n" +
  unitEconomics +
  "\n\n---\n\n" +
  userGrowth +
  "\n\n---\n\n" +
  featureCostsBeforeTokens +
  (featureCostsTokens ? "\n\n---\n\n" + featureCostsTokens : "") +
  "\n\n---\n\n" +
  pricingRoadmap;

const architectureDetailed = architecture + "\n\n---\n\n" + decisions;

const aiDetailed = aiPrompts;

const historyDetailed = stripTemplate(changes);

const problemsDetailed = audits + "\n\n---\n\n" + roadmap;

const SECTIONS = [
  { id: "overview", label: "Обзор проекта", brief: overviewBrief, detailed: overviewDetailed },
  { id: "business", label: "Бизнес", brief: businessBrief, detailed: businessDetailed },
  { id: "architecture", label: "Архитектура", brief: architectureBrief, detailed: architectureDetailed },
  { id: "ai", label: "AI", brief: aiBrief, detailed: aiDetailed },
  { id: "history", label: "История", brief: historyBrief, detailed: historyDetailed },
  { id: "problems", label: "Проблемы", brief: problemsBrief, detailed: problemsDetailed },
];

const generatedAt = new Date().toISOString().slice(0, 10);

const payload = {
  generatedAt,
  sections: SECTIONS,
  sources: {
    overview: overviewDetailed,
    architecture: architectureDetailed,
    history: historyDetailed,
    pricing: pricingOverview,
    economics: unitEconomics,
    problems: problemsBrief + "\n\n---\n\n" + problemsDetailed,
    ai: aiDetailed,
    business: businessDetailed,
  },
};

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Viral — Операционная панель</title>
  <style>
    :root {
      --bg: #0d0f14;
      --surface: #151922;
      --surface2: #1c2230;
      --border: #2d3548;
      --text: #e8ecf4;
      --muted: #8b95a8;
      --accent: #6ee7a8;
      --accent-dim: #2d9a62;
      --gold: #f0c674;
      --sidebar-w: 220px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.65;
      min-height: 100vh;
    }
    .layout { display: flex; min-height: 100vh; }
    aside {
      width: var(--sidebar-w);
      background: var(--surface);
      border-right: 1px solid var(--border);
      padding: 1rem 0;
      position: fixed;
      top: 0; left: 0; bottom: 0;
      overflow-y: auto;
      z-index: 10;
    }
    .brand {
      padding: 0 1rem 1rem;
      font-weight: 700;
      font-size: 0.95rem;
      color: var(--accent);
      border-bottom: 1px solid var(--border);
      margin-bottom: 0.5rem;
    }
    .brand small { display: block; color: var(--muted); font-weight: 400; font-size: 0.68rem; margin-top: 0.25rem; line-height: 1.4; }
    nav button {
      display: block;
      width: 100%;
      text-align: left;
      padding: 0.5rem 1rem;
      background: none;
      border: none;
      color: var(--muted);
      font-size: 0.875rem;
      cursor: pointer;
      border-left: 3px solid transparent;
    }
    nav button:hover { color: var(--text); background: rgba(255,255,255,0.04); }
    nav button.active { color: var(--text); border-left-color: var(--accent); background: rgba(110,231,168,0.07); }
    main {
      margin-left: var(--sidebar-w);
      flex: 1;
      padding: 1.5rem 2rem 3rem;
      max-width: 960px;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }
    .mode-toggle {
      display: inline-flex;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      margin-right: 0.5rem;
    }
    .mode-toggle button {
      padding: 0.35rem 0.85rem;
      font-size: 0.75rem;
      border: none;
      background: var(--surface);
      color: var(--muted);
      cursor: pointer;
    }
    .mode-toggle button.active {
      background: var(--accent-dim);
      color: #fff;
      font-weight: 600;
    }
    .toolbar .copy-btn {
      padding: 0.35rem 0.75rem;
      font-size: 0.72rem;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      cursor: pointer;
    }
    .toolbar .copy-btn:hover { border-color: var(--muted); }
    .toolbar .btn-primary {
      background: var(--accent-dim) !important;
      border-color: var(--accent) !important;
      color: #fff !important;
      font-weight: 600;
    }
    .toast {
      position: fixed; bottom: 1rem; right: 1rem;
      background: var(--accent-dim); color: #fff;
      padding: 0.5rem 1rem; border-radius: 6px;
      font-size: 0.8rem; opacity: 0; transition: opacity 0.2s;
      pointer-events: none; z-index: 100;
    }
    .toast.show { opacity: 1; }
    .content h1 { font-size: 1.75rem; margin: 0 0 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .content h2 { font-size: 1.2rem; margin: 1.5rem 0 0.75rem; color: var(--accent); }
    .content h3 { font-size: 1rem; margin: 1.25rem 0 0.5rem; color: var(--gold); }
    .content p { margin: 0.5rem 0; }
    .content ul, .content ol { margin: 0.5rem 0 0.5rem 1.5rem; }
    .content li { margin: 0.25rem 0; }
    .content hr { border: none; border-top: 1px solid var(--border); margin: 1.5rem 0; }
    .content blockquote {
      border-left: 3px solid var(--accent);
      padding-left: 1rem; margin: 1rem 0;
      color: var(--muted); font-size: 0.9rem;
    }
    .content code {
      background: rgba(110,118,129,0.25);
      padding: 0.15em 0.4em; border-radius: 4px;
      font-size: 0.85em; font-family: ui-monospace, monospace;
    }
    .content pre {
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      overflow-x: auto;
      margin: 0.75rem 0;
      font-size: 0.78rem;
    }
    .content pre code { background: none; padding: 0; }
    .content table {
      width: 100%; border-collapse: collapse;
      margin: 0.75rem 0; font-size: 0.82rem;
    }
    .content th, .content td {
      border: 1px solid var(--border);
      padding: 0.45rem 0.6rem; text-align: left;
      vertical-align: top;
    }
    .content th { background: var(--surface2); color: var(--accent); }
    .content a { color: var(--accent); }
    .content strong { color: #fff; }
    .chatgpt-panel { margin-top: 0.5rem; }
    .chatgpt-panel p { color: var(--muted); font-size: 0.9rem; margin-bottom: 1rem; }
    .chatgpt-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.75rem;
    }
    .chatgpt-grid button {
      padding: 0.85rem 1rem;
      text-align: left;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface2);
      color: var(--text);
      cursor: pointer;
      font-size: 0.85rem;
      line-height: 1.4;
    }
    .chatgpt-grid button:hover { border-color: var(--accent); }
    .chatgpt-grid button.primary {
      border-color: var(--accent);
      background: rgba(45,154,98,0.15);
      font-weight: 600;
    }
    .maintenance {
      margin-top: 2rem;
      padding: 1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 0.85rem;
    }
    .maintenance h2 { font-size: 1rem; margin-top: 0; }
    @media (max-width: 768px) {
      aside { position: relative; width: 100%; border-right: none; border-bottom: 1px solid var(--border); }
      .layout { flex-direction: column; }
      main { margin-left: 0; padding: 1rem; }
      nav { display: flex; flex-wrap: wrap; }
      nav button { width: auto; border-left: none; border-bottom: 2px solid transparent; padding: 0.4rem 0.75rem; }
      nav button.active { border-bottom-color: var(--accent); }
    }
  </style>
</head>
<body>
  <div class="layout">
    <aside>
      <div class="brand">Viral<small>Операционная панель · ${generatedAt}</small></div>
      <nav id="nav"></nav>
    </aside>
    <main>
      <div class="toolbar" id="toolbar"></div>
      <article class="content" id="content"></article>
      <section class="maintenance content" id="maintenance"></section>
    </main>
  </div>
  <div class="toast" id="toast">Скопировано</div>
  <script type="application/json" id="docs-json">${JSON.stringify(payload)}</script>
  <script>
${read(join(ROOT, "dashboard-app.js"), "utf8")}
  </script>
</body>
</html>`;

writeFileSync(join(ROOT, "dashboard.html"), html, "utf8");
console.log("Готово: dashboard.html (" + SECTIONS.length + " разделов + ChatGPT)");
