import { Suspense } from "react";
import { AdminShell } from "@/components/admin/shell/AdminShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell>
      <Suspense fallback={<p className="text-sm text-zinc-500">Загрузка…</p>}>{children}</Suspense>
    </AdminShell>
  );
}
