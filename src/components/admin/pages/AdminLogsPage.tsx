"use client";

import { AdminEventsConsole } from "@/components/admin/AdminEventsConsole";
import { useAdmin } from "@/components/admin/shell/AdminContext";
import { AdminPageHeader } from "@/components/admin/shell/AdminPageHeader";

export function AdminLogsPage() {
  const { appendKey } = useAdmin();
  return (
    <div className="space-y-6">
      <AdminPageHeader
        status="live"
        title="Логи"
        description="Поток admin events: ingest, тренды, ошибки API. Meta редактируется — секреты не показываются."
      />
      <AdminEventsConsole appendKey={appendKey} />
    </div>
  );
}
