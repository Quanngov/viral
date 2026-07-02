(function () {
  "use strict";

  var payload = JSON.parse(document.getElementById("docs-json").textContent);
  var SECTIONS = payload.sections;
  var SOURCES = payload.sources;
  var CHATGPT_ID = "chatgpt";

  var currentSection = "overview";
  var currentMode = "brief";

  var MAINTENANCE_MD =
    "## Обновление документации\n\n" +
    "| Что | Файл |\n" +
    "|-----|------|\n" +
    "| Обзор, потоки | `00-project-overview.md` |\n" +
    "| Архитектура | `01-architecture.md` |\n" +
    "| Изменения в коде | `02-change-log.md` |\n" +
    "| AI / промпты | `03-ai-prompts.md` |\n" +
    "| Интеграции | `04-services-and-integrations.md` |\n" +
    "| Решения | `05-known-decisions.md` |\n" +
    "| Аудиты | `06-audits.md` |\n" +
    "| Roadmap | `07-roadmap.md` |\n" +
    "| Тарифы, экономика | `pricing/*.md` |\n\n" +
    "```bash\nnode project-docs/build-dashboard.mjs\n```\n\n" +
    "Единый дэшборд: `project-docs/dashboard.html` (работает через `file://`).";

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function inlineFormat(s) {
    s = escapeHtml(s);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return s;
  }

  function isSeparatorRow(row) {
    return row.every(function (c) {
      return /^[-:\s|]+$/.test(c.trim());
    });
  }

  function renderMarkdown(md) {
    if (!md) return "<p><em>Нет данных</em></p>";
    var lines = md.replace(/\r\n/g, "\n").split("\n");
    var html = [];
    var i = 0;
    var inCode = false;
    var codeBuf = [];
    var tableBuf = null;

    function flushTable() {
      if (!tableBuf || tableBuf.length < 1) return;
      html.push("<table>");
      tableBuf.forEach(function (row, ri) {
        if (ri === 1 && isSeparatorRow(row)) return;
        var tag = ri === 0 ? "th" : "td";
        html.push(
          "<tr>" +
            row
              .map(function (c) {
                return "<" + tag + ">" + inlineFormat(c.trim()) + "</" + tag + ">";
              })
              .join("") +
            "</tr>",
        );
      });
      html.push("</table>");
      tableBuf = null;
    }

    while (i < lines.length) {
      var line = lines[i];

      if (line.startsWith("```")) {
        if (inCode) {
          html.push("<pre><code>" + escapeHtml(codeBuf.join("\n")) + "</code></pre>");
          codeBuf = [];
          inCode = false;
        } else {
          flushTable();
          inCode = true;
        }
        i++;
        continue;
      }
      if (inCode) {
        codeBuf.push(line);
        i++;
        continue;
      }

      if (/^\|.+\|$/.test(line.trim())) {
        if (!tableBuf) tableBuf = [];
        tableBuf.push(line.split("|").slice(1, -1));
        i++;
        continue;
      }
      flushTable();

      if (/^---+$/.test(line.trim())) {
        html.push("<hr>");
        i++;
        continue;
      }
      if (/^# (.+)$/.test(line)) {
        html.push("<h1>" + inlineFormat(line.slice(2)) + "</h1>");
        i++;
        continue;
      }
      if (/^## (.+)$/.test(line)) {
        html.push("<h2>" + inlineFormat(line.slice(3)) + "</h2>");
        i++;
        continue;
      }
      if (/^### (.+)$/.test(line)) {
        html.push("<h3>" + inlineFormat(line.slice(4)) + "</h3>");
        i++;
        continue;
      }
      if (/^> (.+)$/.test(line)) {
        html.push("<blockquote>" + inlineFormat(line.slice(2)) + "</blockquote>");
        i++;
        continue;
      }
      if (/^[-*] (.+)$/.test(line)) {
        html.push("<ul>");
        while (i < lines.length && /^[-*] (.+)$/.test(lines[i])) {
          html.push("<li>" + inlineFormat(lines[i].replace(/^[-*] /, "")) + "</li>");
          i++;
        }
        html.push("</ul>");
        continue;
      }
      if (/^\d+\. (.+)$/.test(line)) {
        html.push("<ol>");
        while (i < lines.length && /^\d+\. (.+)$/.test(lines[i])) {
          html.push("<li>" + inlineFormat(lines[i].replace(/^\d+\. /, "")) + "</li>");
          i++;
        }
        html.push("</ol>");
        continue;
      }
      if (line.trim() === "") {
        i++;
        continue;
      }
      html.push("<p>" + inlineFormat(line) + "</p>");
      i++;
    }
    flushTable();
    if (inCode && codeBuf.length) {
      html.push("<pre><code>" + escapeHtml(codeBuf.join("\n")) + "</code></pre>");
    }
    return html.join("\n");
  }

  function getSection(id) {
    for (var i = 0; i < SECTIONS.length; i++) {
      if (SECTIONS[i].id === id) return SECTIONS[i];
    }
    return null;
  }

  function getSectionContent(id, mode) {
    var sec = getSection(id);
    if (!sec) return "";
    return mode === "detailed" ? sec.detailed : sec.brief;
  }

  function buildFullContext() {
    var date = new Date().toISOString().slice(0, 10);
    var parts = [
      "# Viral — полный контекст проекта",
      "Дата: " + date,
      "Задача: помоги с продуктом, кодом, тарифами и приоритетами для SaaS в РФ/СНГ.\n",
    ];
    SECTIONS.forEach(function (s) {
      parts.push("## " + s.label + " (кратко)\n");
      parts.push(s.brief);
      parts.push("");
    });
    return parts.join("\n");
  }

  function buildPricingCopy() {
    return (
      "# Viral — тарифы\n\n" +
      getSectionContent("business", "brief") +
      "\n\n---\n\n" +
      extractFromSource(SOURCES.pricing, "## Списания токенов", "## Позиционирование")
    );
  }

  function buildEconomicsCopy() {
    return "# Viral — юнит-экономика\n\n" + SOURCES.economics;
  }

  function buildProblemsCopy() {
    return "# Viral — проблемы и roadmap\n\n" + getSectionContent("problems", "brief");
  }

  function extractFromSource(md, start, end) {
    var i = md.indexOf(start);
    if (i < 0) return "";
    if (!end) return md.slice(i);
    var j = md.indexOf(end, i + start.length);
    return j < 0 ? md.slice(i) : md.slice(i, j);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(showToast).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast();
    } catch (e) {
      alert("Не удалось скопировать");
    }
    document.body.removeChild(ta);
  }

  function showToast() {
    var t = document.getElementById("toast");
    t.classList.add("show");
    setTimeout(function () {
      t.classList.remove("show");
    }, 1500);
  }

  var nav = document.getElementById("nav");
  var toolbar = document.getElementById("toolbar");
  var content = document.getElementById("content");
  var maintenance = document.getElementById("maintenance");

  var navItems = SECTIONS.concat([{ id: CHATGPT_ID, label: "Для ChatGPT" }]);

  navItems.forEach(function (item, idx) {
    var btn = document.createElement("button");
    btn.textContent = item.label;
    btn.dataset.id = item.id;
    btn.addEventListener("click", function () {
      showSection(item.id);
    });
    nav.appendChild(btn);
    if (idx === 0) btn.classList.add("active");
  });

  function renderToolbar() {
    toolbar.innerHTML = "";

    if (currentSection === CHATGPT_ID) return;

    var toggle = document.createElement("div");
    toggle.className = "mode-toggle";

    ["brief", "detailed"].forEach(function (mode) {
      var mb = document.createElement("button");
      mb.textContent = mode === "brief" ? "Кратко" : "Подробно";
      mb.dataset.mode = mode;
      if (currentMode === mode) mb.classList.add("active");
      mb.addEventListener("click", function () {
        currentMode = mode;
        renderToolbar();
        renderContent();
        updateHash();
      });
      toggle.appendChild(mb);
    });

    toolbar.appendChild(toggle);
  }

  function renderChatGptPanel() {
    var html =
      "<h1>Для ChatGPT</h1>" +
      '<div class="chatgpt-panel">' +
      "<p>Скопируйте готовый контекст — без чтения десятков страниц. " +
      "Краткие выжимки для быстрых вопросов; полные документы — в соответствующих кнопках.</p>" +
      '<div class="chatgpt-grid" id="chatgpt-grid"></div></div>';

    content.innerHTML = html;

    var grid = document.getElementById("chatgpt-grid");
    var buttons = [
      { label: "Полный контекст проекта", fn: buildFullContext, primary: true },
      { label: "Архитектура", fn: function () { return SOURCES.architecture; } },
      { label: "История изменений", fn: function () { return SOURCES.history; } },
      { label: "Тарифы", fn: buildPricingCopy },
      { label: "Юнит-экономика", fn: buildEconomicsCopy },
      { label: "Проблемы", fn: buildProblemsCopy },
    ];

    buttons.forEach(function (b) {
      var btn = document.createElement("button");
      btn.textContent = b.label;
      if (b.primary) btn.classList.add("primary");
      btn.addEventListener("click", function () {
        copyText(b.fn());
      });
      grid.appendChild(btn);
    });
  }

  function renderContent() {
    if (currentSection === CHATGPT_ID) {
      renderChatGptPanel();
      return;
    }
    content.innerHTML = renderMarkdown(getSectionContent(currentSection, currentMode));
  }

  function updateHash() {
    try {
      var h = currentSection === CHATGPT_ID ? CHATGPT_ID : currentSection + "-" + currentMode;
      if (location.hash !== "#" + h) {
        history.replaceState(null, "", "#" + h);
      }
    } catch (e) {
      /* file:// */
    }
  }

  function showSection(id) {
    currentSection = id;
    if (id !== CHATGPT_ID) {
      currentMode = "brief";
    }
    nav.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.id === id);
    });
    renderToolbar();
    renderContent();
    updateHash();
  }

  function parseHash() {
    var hash = "";
    try {
      hash = location.hash.slice(1);
    } catch (e) {
      return { section: "overview", mode: "brief" };
    }
    if (!hash) return { section: "overview", mode: "brief" };
    if (hash === CHATGPT_ID) return { section: CHATGPT_ID, mode: "brief" };
    if (hash.endsWith("-detailed")) {
      return { section: hash.replace(/-detailed$/, ""), mode: "detailed" };
    }
    if (hash.endsWith("-brief")) {
      return { section: hash.replace(/-brief$/, ""), mode: "brief" };
    }
    var known = navItems.some(function (n) {
      return n.id === hash;
    });
    if (known) return { section: hash, mode: "brief" };
    return { section: "overview", mode: "brief" };
  }

  maintenance.innerHTML = renderMarkdown(MAINTENANCE_MD);

  var initial = parseHash();
  currentSection = initial.section;
  currentMode = initial.mode;
  if (currentSection === CHATGPT_ID) currentMode = "brief";

  nav.querySelectorAll("button").forEach(function (b) {
    b.classList.toggle("active", b.dataset.id === currentSection);
  });
  renderToolbar();
  renderContent();
})();
