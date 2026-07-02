import { Suspense } from "react";
import { AdminApp } from "@/components/admin/AdminApp";
import { adminSectionFromPath, type AdminSectionId } from "@/components/admin/shell/admin-nav-config";

export default async function AdminSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const secret = process.env.ADMIN_SECRET?.trim();
  const { section: sectionParam } = await params;
  const sp = await searchParams;

  if (secret && sp.key !== secret) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium text-zinc-800">Доступ ограничен</p>
        <p className="max-w-md text-sm text-zinc-500">
          Укажите ключ: <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs">/admin?key=…</code>
        </p>
      </div>
    );
  }

  const section = adminSectionFromPath(`/admin/${sectionParam}`) as AdminSectionId;

  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Загрузка раздела…</p>}>
      <AdminApp section={section} />
    </Suspense>
  );
}
