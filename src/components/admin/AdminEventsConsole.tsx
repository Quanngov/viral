"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

type AdminEventRow = {
  id: string;
  createdAt: string;
  level: string;
  type: string;
  message: string;
  sessionId: string | null;
  userId: string | null;
  metaJson: string | null;
};

function levelClass(level: string): string {
  if (level === "error") return "text-red-700 bg-red-50 ring-red-200";
  if (level === "warn") return "text-amber-800 bg-amber-50 ring-amber-200";
  if (level === "debug") return "text-zinc-500 bg-zinc-100 ring-zinc-200";
  return "text-zinc-700 bg-zinc-100 ring-zinc-200";
}

export function AdminEventsConsole({ appendKey }: { appendKey: (path: string) => string }) {
  const [events, setEvents] = useState<AdminEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [level, setLevel] = useState<string>("all");
  const [type, setType] = useState<string>("");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [qDebounced, setQDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  const queryUrl = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", "200");
    if (level !== "all") p.set("level", level);
    if (type.trim()) p.set("type", type.trim());
    if (qDebounced) p.set("q", qDebounced);
    return appendKey(`/api/admin/events?${p.toString()}`);
  }, [appendKey, level, type, qDebounced]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(queryUrl, { cache: "no-store" });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { message?: string } | null;
        setErr(j?.message ?? `HTTP ${res.status}`);
        setEvents([]);
        return;
      }
      const data = (await res.json()) as { events?: AdminEventRow[] };
      setEvents(data.events ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка загрузки");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [queryUrl]);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => {
      startTransition(() => {
        void load();
      });
    }, 5000);
    return () => clearInterval(t);
  }, [load]);

  const typeOptions = useMemo(() => {
    const s = new Set<string>();
    for (const e of events) s.add(e.type);
    return [...s].sort();
  }, [events]);

  return (
    <section className="flex max-h-[calc(100dvh-10rem)] flex-col rounded-xl border border-zinc-200/80 bg-white xl:max-h-[calc(100dvh-12rem)]">
      <div className="border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">Консоль событий</h2>
        <p className="mt-0.5 text-[11px] text-zinc-500">Обновление каждые 5 с · без секретов в meta</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-zinc-50 px-3 py-2">
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs"
        >
          <option value="all">Все уровни</option>
          <option value="info">info</option>
          <option value="warn">warn</option>
          <option value="error">error</option>
          <option value="debug">debug</option>
        </select>
        <input
          list="admin-event-types"
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="type"
          className="h-8 min-w-[120px] flex-1 rounded-lg border border-zinc-200 bg-white px-2 text-xs"
        />
        <datalist id="admin-event-types">
          {typeOptions.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск в message"
          className="h-8 min-w-[100px] flex-[2] rounded-lg border border-zinc-200 bg-white px-2 text-xs"
        />
        <button
          type="button"
          onClick={() => void load()}
          className="h-8 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
        >
          Обновить
        </button>
      </div>

      {err ? <p className="px-3 py-2 text-xs text-red-600">{err}</p> : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {loading && events.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-zinc-500">Загрузка…</p>
        ) : events.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-zinc-500">Событий нет</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => {
              const open = expanded[e.id] ?? false;
              let pretty = "";
              if (e.metaJson) {
                try {
                  pretty = JSON.stringify(JSON.parse(e.metaJson), null, 2);
                } catch {
                  pretty = e.metaJson;
                }
              }
              return (
                <li
                  key={e.id}
                  className={`rounded-xl border px-2 py-1.5 text-[11px] leading-snug ring-1 ${
                    e.level === "error"
                      ? "border-red-100 bg-red-50/50 ring-red-100"
                      : e.level === "warn"
                        ? "border-amber-100 bg-amber-50/40 ring-amber-100"
                        : "border-zinc-100 bg-zinc-50/40 ring-zinc-100"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="whitespace-nowrap font-mono text-[10px] text-zinc-500">
                      {new Date(e.createdAt).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1 ${levelClass(e.level)}`}>
                      {e.level}
                    </span>
                    <span className="font-mono text-[10px] text-emerald-800">{e.type}</span>
                  </div>
                  <p className="mt-1 break-words text-zinc-800">{e.message}</p>
                  {e.metaJson ? (
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => setExpanded((m) => ({ ...m, [e.id]: !open }))}
                        className="text-[10px] font-medium text-emerald-700 underline-offset-2 hover:underline"
                      >
                        {open ? "Свернуть meta" : "Meta JSON"}
                      </button>
                      {open ? (
                        <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-zinc-900/95 p-2 text-[10px] text-zinc-100">
                          {pretty}
                        </pre>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
