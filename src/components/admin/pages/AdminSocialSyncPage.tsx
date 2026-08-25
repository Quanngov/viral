"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/shell/AdminContext";
import { AdminPageHeader } from "@/components/admin/shell/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/shell/AdminStatusBadge";

type SocialAdminPayload = {
  jobsByStatus: Record<string, number>;
  rateLimits: Record<string, { used: number; limit: number; resetAt: number | null }>;
  providers: { platform: string; capabilities: { oauth: boolean; webhooks: boolean; limitations: string[] } }[];
  connections: {
    id: string;
    platform: string;
    username: string;
    authMethod: string;
    connectionStatus: string;
    connectionHealth: string;
    syncStatus: string;
    updateStrategy: string;
    lastSyncSuccessAt: string | null;
    nextSyncAt: string | null;
    lastSyncError: string;
  }[];
  webhooks: {
    subscriptions: { id: string; platform: string; status: string; lastEventAt: string | null; lastSuccessAt: string | null; failureCount: number; socialAccount: { username: string } }[];
    recentEvents: { id: string; platform: string; eventType: string; status: string; receivedAt: string; errorMessage: string }[];
    failedCount: number;
  };
  failedLogs: { id: string; platform: string; message: string; createdAt: string }[];
  recentJobs: { id: string; platform: string; trigger: string; status: string; lastError: string; createdAt: string; socialAccount: { username: string } }[];
};

export function AdminSocialSyncPage() {
  const { appendKey } = useAdmin();
  const [data, setData] = useState<SocialAdminPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(appendKey("/api/admin/social"));
      const json = (await res.json()) as SocialAdminPayload;
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [appendKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (action: string) => {
    setActionMsg(null);
    const res = await fetch(appendKey("/api/admin/social"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    setActionMsg(json.ok ? `Выполнено: ${action}` : "Ошибка");
    void load();
  };

  if (loading && !data) {
    return <p className="text-sm text-zinc-500">Загрузка Social Sync…</p>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        status="live"
        title="Social Sync"
        description="OAuth-подключения, очередь, webhooks, провайдеры и логи синхронизации."
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void runAction("process_queue")}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
        >
          Обработать очередь
        </button>
        <button
          type="button"
          onClick={() => void runAction("run_scheduled")}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700"
        >
          Запланировать due-sync
        </button>
        <button type="button" onClick={() => void load()} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600">
          Обновить
        </button>
      </div>
      {actionMsg ? <p className="text-xs text-emerald-700">{actionMsg}</p> : null}

      <section className="rounded-xl border border-zinc-200/80 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Очередь</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(data?.jobsByStatus ?? {}).map(([status, count]) => (
            <span key={status} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700">
              {status}: {count}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200/80 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Провайдеры</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {data?.providers.map((p) => (
            <div key={p.platform} className="rounded-lg border border-zinc-100 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize text-zinc-800">{p.platform}</span>
                <AdminStatusBadge status={p.capabilities.oauth ? "live" : "preview"} />
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                OAuth: {p.capabilities.oauth ? "да" : "нет"} · Webhooks: {p.capabilities.webhooks ? "да" : "нет"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200/80 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Rate limits</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {Object.entries(data?.rateLimits ?? {}).map(([platform, r]) => (
            <p key={platform} className="text-xs text-zinc-600">
              <span className="font-medium capitalize">{platform}</span>: {r.used}/{r.limit} req/min
            </p>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200/80 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">OAuth-подключения</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-zinc-500">
                <th className="pb-2 pr-3">Платформа</th>
                <th className="pb-2 pr-3">Аккаунт</th>
                <th className="pb-2 pr-3">Статус</th>
                <th className="pb-2 pr-3">Sync</th>
                <th className="pb-2">След. sync</th>
              </tr>
            </thead>
            <tbody>
              {(data?.connections ?? []).map((c) => (
                <tr key={c.id} className="border-t border-zinc-100">
                  <td className="py-2 pr-3 capitalize">{c.platform}</td>
                  <td className="py-2 pr-3">@{c.username}</td>
                  <td className="py-2 pr-3">{c.connectionHealth}</td>
                  <td className="py-2 pr-3">{c.syncStatus}</td>
                  <td className="py-2">{c.nextSyncAt ? new Date(c.nextSyncAt).toLocaleString("ru-RU") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200/80 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Webhooks</h2>
        <p className="mt-1 text-xs text-zinc-500">Ошибок: {data?.webhooks.failedCount ?? 0}</p>
        <ul className="mt-3 space-y-2">
          {(data?.webhooks.subscriptions ?? []).slice(0, 8).map((s) => (
            <li key={s.id} className="text-xs text-zinc-600">
              {s.platform} · @{s.socialAccount.username} · {s.status} · events: {s.lastEventAt ? "да" : "нет"}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200/80 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Ошибки синхронизации</h2>
        <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
          {(data?.failedLogs ?? []).map((log) => (
            <li key={log.id} className="text-xs text-red-700">
              [{log.platform}] {log.message}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
