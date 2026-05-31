(function () {
  "use strict";

  var payload = JSON.parse(document.getElementById("docs-json").textContent);
  var DOCS = payload.docs;
  var CONTENTS = payload.contents;

  var MAINTENANCE_MD =
    "## How to update documentation\n\n" +
    "| What | Where |\n" +
    "|------|-------|\n" +
    "| Shipped code changes | `02-change-log.md` |\n" +
    "| Architecture / structure | `01-architecture.md` |\n" +
    "| New env vars / APIs | `04-services-and-integrations.md` |\n" +
    "| Deliberate trade-offs | `05-known-decisions.md` |\n" +
    "| AI prompt policy changes | `03-ai-prompts.md` (summary; full text in `script-generator-prompt.ts`) |\n" +
    "| Audit results | `06-audits.md` + `docs/project-audit-master.md` |\n" +
    "| Planned work | `07-roadmap.md` |\n" +
    "| Project summary | `00-project-overview.md` |\n\n" +
    "After editing any `.md` file, regenerate this dashboard:\n\n" +
    "```bash\nnode project-docs/build-dashboard.mjs\n```\n\n" +
    "Markdown files are the source of truth. `dashboard.html` embeds them for offline `file://` use.";

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

  function buildSnapshot() {
    var openIssues = [
      "Sync ingest in feed HTTP request (latency)",
      "Trends poll continues off Home tab on desktop",
      "~70% API routes without withApiRoute",
      "mockWeeklyTrends on home tab",
      "ScriptGeneratorSection / CompetitorSpySection UI monoliths",
    ].join("\n- ");

    return (
      "# Viral Project Snapshot\n" +
      "Generated: " +
      new Date().toISOString().slice(0, 10) +
      "\n\n" +
      "## Overview\n" +
      getText("overview") +
      "\n\n" +
      "## Architecture (summary)\n" +
      getText("architecture") +
      "\n\n" +
      "## Latest changes\n" +
      getText("changes") +
      "\n\n" +
      "## Active integrations\n" +
      getText("integrations") +
      "\n\n" +
      "## Key decisions\n" +
      getText("decisions") +
      "\n\n" +
      "## Audit summary\n" +
      getText("audits") +
      "\n\n" +
      "## Open issues (from audits / roadmap)\n- " +
      openIssues +
      "\n\n" +
      "## Roadmap\n" +
      getText("roadmap")
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
      alert("Copy failed");
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
    { label: "Copy All", fn: getAllText, primary: false },
    { label: "Copy Project Snapshot", fn: buildSnapshot, primary: true },
    { label: "Copy Overview", fn: function () { return getText("overview"); } },
    { label: "Copy Architecture", fn: function () { return getText("architecture"); } },
    { label: "Copy Changes", fn: function () { return getText("changes"); } },
    { label: "Copy Prompts", fn: function () { return getText("prompts"); } },
    { label: "Copy Integrations", fn: function () { return getText("integrations"); } },
    { label: "Copy Decisions", fn: function () { return getText("decisions"); } },
    { label: "Copy Audits", fn: function () { return getText("audits"); } },
    { label: "Copy Roadmap", fn: function () { return getText("roadmap"); } },
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
      /* file:// may restrict history in some browsers */
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
