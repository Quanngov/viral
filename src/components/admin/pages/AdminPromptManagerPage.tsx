"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PromptDefinition } from "@/lib/admin/prompt-catalog";
import { PROMPT_GROUP_LABELS } from "@/lib/admin/prompt-catalog";
import { useAdmin } from "@/components/admin/shell/AdminContext";
import { AdminInfoTip } from "@/components/admin/shell/AdminInfoTip";
import { AdminPageHeader } from "@/components/admin/shell/AdminPageHeader";
import { AdminPreviewBanner } from "@/components/admin/shell/AdminPrimitives";

type PromptVersion = {
  id: string;
  savedAt: string;
  content: string;
  note: string;
};

const VERSIONS_KEY = "viral_admin_prompt_versions_v1";

function loadVersions(): Record<string, PromptVersion[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(VERSIONS_KEY) ?? "{}") as Record<string, PromptVersion[]>;
  } catch {
    return {};
  }
}

function saveVersions(v: Record<string, PromptVersion[]>) {
  localStorage.setItem(VERSIONS_KEY, JSON.stringify(v));
}

export function AdminPromptManagerPage() {
  const { appendKey } = useAdmin();
  const [prompts, setPrompts] = useState<PromptDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [versions, setVersions] = useState<Record<string, PromptVersion[]>>({});
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setVersions(loadVersions());
    void fetch(appendKey("/api/admin/prompts"))
      .then((r) => r.json())
      .then((d: { prompts?: PromptDefinition[] }) => {
        const list = d.prompts ?? [];
        setPrompts(list);
        if (list[0]) {
          setSelectedId(list[0].id);
          setDraft(list[0].content);
        }
      })
      .catch(() => setErr("Не удалось загрузить каталог промптов"));
  }, [appendKey]);

  const selected = useMemo(
    () => prompts.find((p) => p.id === selectedId) ?? null,
    [prompts, selectedId],
  );

  const filtered = useMemo(() => {
    if (groupFilter === "all") return prompts;
    return prompts.filter((p) => p.group === groupFilter);
  }, [prompts, groupFilter]);

  const selectPrompt = useCallback(
    (p: PromptDefinition) => {
      setSelectedId(p.id);
      setDraft(p.content);
      setTestOutput(null);
    },
    [],
  );

  const saveVersion = useCallback(() => {
    if (!selected) return;
    const entry: PromptVersion = {
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      content: draft,
      note: "Ручное сохранение из админки",
    };
    const next = { ...versions, [selected.id]: [entry, ...(versions[selected.id] ?? [])].slice(0, 20) };
    setVersions(next);
    saveVersions(next);
  }, [selected, draft, versions]);

  const restoreVersion = useCallback((v: PromptVersion) => {
    setDraft(v.content);
  }, []);

  const runTest = useCallback(() => {
    setTestOutput(
      `[Preview — без вызова модели]\n\nДлина: ${draft.length} символов\nПервые 400 символов:\n\n${draft.slice(0, 400)}${draft.length > 400 ? "…" : ""}`,
    );
  }, [draft]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        status="live"
        title="Prompt Manager"
        description="Все AI-промпты платформы. Live-промпты читаются из каталога; деплой в прод — через код или будущий admin API."
      />

      <AdminPreviewBanner title="Версии — localStorage · Test — preview без LLM">
        Сохранение версий работает локально в браузере. Кнопка «Применить в прод» появится с admin mutations API.
        Тест сейчас показывает preview текста без вызова DeepSeek.
      </AdminPreviewBanner>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-zinc-200/80 bg-white p-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Группа
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="h-9 rounded-lg border border-zinc-200 px-2 text-sm"
            >
              <option value="all">Все</option>
              {Object.entries(PROMPT_GROUP_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <ul className="mt-3 max-h-[28rem] space-y-1 overflow-y-auto">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => selectPrompt(p)}
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                    selectedId === p.id
                      ? "bg-emerald-50 font-semibold text-emerald-900 ring-1 ring-emerald-200"
                      : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="space-y-4">
          {selected ? (
            <>
              <div className="rounded-xl border border-zinc-200/80 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-zinc-900">{selected.name}</h2>
                    <p className="mt-1 text-xs text-zinc-500">{selected.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                    <span className="rounded-md bg-zinc-100 px-2 py-1">
                      Модель: {selected.modelHint}
                      <AdminInfoTip text="Подсказка какая модель или движок использует этот промпт." />
                    </span>
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">{selected.status}</span>
                  </div>
                </div>
                {selected.variables.length > 0 ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    Переменные: {selected.variables.join(", ")}
                  </p>
                ) : null}
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={16}
                  className="mt-4 w-full resize-y rounded-lg border border-zinc-200 bg-zinc-50/30 p-3 font-mono text-xs leading-relaxed outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={saveVersion}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Сохранить версию
                  </button>
                  <button
                    type="button"
                    onClick={runTest}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Test preview
                  </button>
                  <button
                    type="button"
                    disabled
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-400"
                    title="Требуется admin API"
                  >
                    Применить в прод
                  </button>
                </div>
              </div>

              {(versions[selected.id]?.length ?? 0) > 0 ? (
                <section className="rounded-xl border border-zinc-200/80 bg-white p-4">
                  <h3 className="text-sm font-semibold text-zinc-900">История версий (локально)</h3>
                  <ul className="mt-2 space-y-2">
                    {versions[selected.id]?.map((v) => (
                      <li
                        key={v.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs"
                      >
                        <span className="text-zinc-600">{new Date(v.savedAt).toLocaleString("ru-RU")}</span>
                        <button
                          type="button"
                          onClick={() => restoreVersion(v)}
                          className="font-semibold text-emerald-700 hover:underline"
                        >
                          Восстановить
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {testOutput ? (
                <pre className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-900 p-4 text-xs leading-relaxed text-zinc-100">
                  {testOutput}
                </pre>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
