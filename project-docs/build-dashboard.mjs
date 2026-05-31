#!/usr/bin/env node
/**
 * Regenerates dashboard.html from project-docs/*.md files.
 * Run after editing markdown: node project-docs/build-dashboard.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));

const DOCS = [
  { id: "overview", file: "00-project-overview.md", label: "Overview" },
  { id: "architecture", file: "01-architecture.md", label: "Architecture" },
  { id: "changes", file: "02-change-log.md", label: "Changes" },
  { id: "prompts", file: "03-ai-prompts.md", label: "Prompts" },
  { id: "integrations", file: "04-services-and-integrations.md", label: "Integrations" },
  { id: "decisions", file: "05-known-decisions.md", label: "Decisions" },
  { id: "audits", file: "06-audits.md", label: "Audits" },
  { id: "roadmap", file: "07-roadmap.md", label: "Roadmap" },
];

const contents = {};
for (const doc of DOCS) {
  contents[doc.id] = readFileSync(join(__dir, doc.file), "utf8");
}

const generatedAt = new Date().toISOString().slice(0, 10);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Viral — Project Docs</title>
  <style>
    :root {
      --bg: #0f1117;
      --surface: #161b22;
      --border: #30363d;
      --text: #e6edf3;
      --muted: #8b949e;
      --accent: #3fb950;
      --accent-dim: #238636;
      --sidebar-w: 220px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
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
    .brand small { display: block; color: var(--muted); font-weight: 400; font-size: 0.7rem; margin-top: 0.25rem; }
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
    nav button.active { color: var(--text); border-left-color: var(--accent); background: rgba(63,185,80,0.08); }
    main {
      margin-left: var(--sidebar-w);
      flex: 1;
      padding: 1.5rem 2rem 3rem;
      max-width: 900px;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }
    .toolbar button, .toolbar .btn-primary {
      padding: 0.35rem 0.75rem;
      font-size: 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      cursor: pointer;
    }
    .toolbar button:hover { border-color: var(--muted); }
    .btn-primary { background: var(--accent-dim) !important; border-color: var(--accent) !important; color: #fff !important; font-weight: 600; }
    .btn-primary:hover { filter: brightness(1.1); }
    .toast {
      position: fixed; bottom: 1rem; right: 1rem;
      background: var(--accent-dim); color: #fff;
      padding: 0.5rem 1rem; border-radius: 6px;
      font-size: 0.8rem; opacity: 0; transition: opacity 0.2s;
      pointer-events: none; z-index: 100;
    }
    .toast.show { opacity: 1; }
    .content h1 { font-size: 1.75rem; margin: 0 0 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .content h2 { font-size: 1.25rem; margin: 1.5rem 0 0.75rem; color: var(--accent); }
    .content h3 { font-size: 1rem; margin: 1.25rem 0 0.5rem; }
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
      background: rgba(110,118,129,0.2);
      padding: 0.15em 0.4em; border-radius: 4px;
      font-size: 0.85em; font-family: ui-monospace, monospace;
    }
    .content pre {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      overflow-x: auto;
      margin: 0.75rem 0;
      font-size: 0.8rem;
    }
    .content pre code { background: none; padding: 0; }
    .content table {
      width: 100%; border-collapse: collapse;
      margin: 0.75rem 0; font-size: 0.85rem;
    }
    .content th, .content td {
      border: 1px solid var(--border);
      padding: 0.4rem 0.6rem; text-align: left;
    }
    .content th { background: var(--surface); color: var(--accent); }
    .content a { color: var(--accent); }
    .content strong { color: #fff; }
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
      <div class="brand">Viral Docs<small>Generated ${generatedAt}</small></div>
      <nav id="nav"></nav>
    </aside>
    <main>
      <div class="toolbar" id="toolbar"></div>
      <article class="content" id="content"></article>
      <section class="maintenance content" id="maintenance"></section>
    </main>
  </div>
  <div class="toast" id="toast">Copied</div>
  <script type="application/json" id="docs-json">${JSON.stringify({ docs: DOCS.map((d) => ({ id: d.id, label: d.label, file: d.file })), contents })}</script>
  <script>
${readFileSync(join(__dir, "dashboard-app.js"), "utf8")}
  </script>
</body>
</html>`;

writeFileSync(join(__dir, "dashboard.html"), html, "utf8");
console.log("Wrote dashboard.html (" + DOCS.length + " docs embedded)");
