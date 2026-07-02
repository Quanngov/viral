"use client";

import { AdminBillingPanel } from "@/components/admin/AdminBillingPanel";
import { useAdmin } from "@/components/admin/shell/AdminContext";
import { AdminPageHeader } from "@/components/admin/shell/AdminPageHeader";

export function AdminBillingPage() {
  const { appendKey } = useAdmin();
  return (
    <div className="space-y-6">
      <AdminPageHeader
        status="live"
        title="Биллинг"
        description="MRR, распределение по тарифам, движение токенов. Данные из /api/admin/billing/stats."
      />
      <AdminBillingPanel appendKey={appendKey} />
    </div>
  );
}
