(function () {
  "use strict";

  var payload = JSON.parse(document.getElementById("docs-json").textContent);
  var DOCS = payload.docs;
  var CONTENTS = payload.contents;

  var MAINTENANCE_MD =
    "## Как обновлять документацию\n\n" +
    "| Что менять | Файл |\n" +
    "|------------|------|\n" +
    "| Цены и лимиты тарифов | `pricing-overview.md` |\n" +
    "| COGS функций и веса токенов | `feature-costs.md` |\n" +
    "| Сценарии по масштабу | `unit-economics.md` |\n" +
    "| Воронка и MRR | `user-growth-model.md` |\n" +
    "| Этапы роста | `pricing-roadmap.md` |\n\n" +
    "После правок любого `.md`:\n\n" +
    "```bash\nnode project-docs/pricing/build-pricing-dashboard.mjs\n```\n\n" +
    "Markdown — источник правды. `pricing-dashboard.html` встраивает текст для работы через `file://`.\n\n" +
    "⚠️ Перед разговором с инвестором замените допущения на реальные счета TikHub и логи usage.";

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
    if (!md) return "<p><em>Нет содержимого</em></p>";
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

  function getText(id) {
    return CONTENTS[id] || "";
  }

  function getAllText() {
    return DOCS.map(function (d) {
      return "=== " + d.label.toUpperCase() + " ===\n\n" + getText(d.id);
    }).join("\n\n");
  }

  function buildFullReport() {
    return (
      "# Viral — отчёт по тарифам и юнит-экономике\n" +
      "Дата: " +
      new Date().toISOString().slice(0, 10) +
      "\n\n" +
      getAllText()
    );
  }

  function buildChatGptSummary() {
    return (
      "# Viral — выжимка для ChatGPT\n" +
      "Дата: " +
      new Date().toISOString().slice(0, 10) +
      "\n" +
      "Контекст: SaaS для блогеров, экспертов, SMM и агентств в РФ/СНГ. " +
      "Поиск Shorts/Reels, шпион конкурентов, генерация сценариев (DeepSeek). " +
      "Стек: Supabase, Vercel, TikHub, DeepSeek. Биллинг пока не подключён.\n\n" +
      "## Тарифы\n\n" +
      "| Тариф | Цена | Токены |\n" +
      "|-------|------|-------:|\n" +
      "| Free Preview | 0 ₽ | 150 разово |\n" +
      "| Trial | 0 ₽ · 3 дня + карта | 1 000 |\n" +
      "| Creator | 2 990 ₽/мес · 29 900 ₽/год | 4 000/мес |\n" +
      "| Visioner | 14 990 ₽/мес · 149 900 ₽/год | 25 000/мес |\n\n" +
      "Рекомендация: запуск с Creator + Visioner; trial с картой → Creator; оплата YooKassa.\n\n" +
      "## Лимиты (первая платная версия)\n\n" +
      "| Лимит | Creator | Visioner |\n" +
      "|-------|---------|----------|\n" +
      "| Конкуренты | 5 | 15 |\n" +
      "| Сохранённые ролики | 200 | 2 000 |\n" +
      "| Внешний поиск | вкл., throttle 15 мин | вкл. + приоритет (план) |\n\n" +
      "Стоимость действий в коде: поиск 0 · «ещё ролики» 5 · сценарий 20 · транскрибация 5 · " +
      "конкурент IG 30 · refresh 30 · daily sync 5.\n\n" +
      "## Юнит-экономика (реалистично)\n\n" +
      "- ARPU: 4 790 ₽ (микс 85% Creator / 15% Visioner)\n" +
      "- @ 100 платящих: MRR 479 000 ₽, затраты 51 525 ₽, валовая маржа 89%\n" +
      "- @ 1 000 платящих: MRR 4 790 000 ₽, маржа 90%\n" +
      "- Break-even solo: ~8–12 платящих; с 1 FTE @ 200k ₽: ~50–60\n" +
      "- Главная неизвестность COGS: TikHub (Instagram)\n\n" +
      "## Прогноз роста (реалистично)\n\n" +
      "| Месяц | Платящих | MRR |\n" +
      "|------:|--------:|----:|\n" +
      "| 1 | 22 | ~105 000 ₽ |\n" +
      "| 3 | 78 | ~374 000 ₽ |\n" +
      "| 6 | 185 | ~886 000 ₽ |\n" +
      "| 12 | 420 | ~2 012 000 ₽ |\n\n" +
      "Конверсии (допущение): free→trial 7%, trial→paid 28%, churn 7%/мес.\n\n" +
      "## Риски\n\n" +
      "1. Неизвестная цена TikHub — может съесть маржу Visioner\n" +
      "2. Синхронный ingest в HTTP — latency и Vercel $\n" +
      "3. Demo-баланс 12 400 токенов в проде без биллинга\n" +
      "4. Злоупотребление Visioner (25k токенов)\n\n" +
      "## Возможности\n\n" +
      "1. В 6–10× дешевле западных research-tools ($199/мес ≈ 16 900 ₽ vs Creator 2 990 ₽)\n" +
      "2. Пакеты токенов для SMM и продюсеров\n" +
      "3. Годовая предоплата (2 месяца в подарок)\n" +
      "4. Async ingest → +5–10 п.п. маржи без смены цен\n\n" +
      "Задача: помоги принять решения по ценообразованию, лимитам и приоритетам запуска в РФ/СНГ."
    );
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

  DOCS.forEach(function (d, idx) {
    var btn = document.createElement("button");
    btn.textContent = d.label;
    btn.dataset.id = d.id;
    btn.addEventListener("click", function () {
      showDoc(d.id);
    });
    nav.appendChild(btn);
    if (idx === 0) btn.classList.add("active");
  });

  var copyDefs = [
    { label: "Скопировать для ChatGPT", fn: buildChatGptSummary, primary: true },
    { label: "Скопировать полный отчёт", fn: buildFullReport },
    { label: "Скопировать тарифы", fn: function () { return getText("pricing"); } },
    { label: "Скопировать юнит-экономику", fn: function () { return getText("economics"); } },
    { label: "Скопировать план масштабирования", fn: function () { return getText("roadmap"); } },
  ];

  copyDefs.forEach(function (c) {
    var b = document.createElement("button");
    b.textContent = c.label;
    if (c.primary) b.className = "btn-primary";
    b.addEventListener("click", function () {
      copyText(c.fn());
    });
    toolbar.appendChild(b);
  });

  function showDoc(id) {
    content.innerHTML = renderMarkdown(getText(id));
    nav.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.id === id);
    });
    try {
      if (location.hash !== "#" + id) {
        history.replaceState(null, "", "#" + id);
      }
    } catch (e) {
      /* file:// */
    }
  }

  maintenance.innerHTML = renderMarkdown(MAINTENANCE_MD);

  var hash = "";
  try {
    hash = location.hash.slice(1);
  } catch (e) {
    hash = "";
  }
  var initial = DOCS.some(function (d) {
    return d.id === hash;
  })
    ? hash
    : DOCS[0].id;
  showDoc(initial);
})();
