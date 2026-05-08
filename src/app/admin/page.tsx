import { AdminVideosApp } from "@/components/admin/AdminVideosApp";

/**
 * TODO: Перед production закрыть /admin полноценной авторизацией.
 *
 * Локально: если в .env задан ADMIN_SECRET, откройте /admin?key=<ADMIN_SECRET>.
 * Без ADMIN_SECRET страница доступна без ключа (только для разработки).
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const secret = process.env.ADMIN_SECRET?.trim();
  const params = await searchParams;

  if (secret && params.key !== secret) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-zinc-50 px-6 text-center">
        <p className="text-sm font-medium text-zinc-800">Доступ ограничен</p>
        <p className="max-w-md text-sm text-zinc-500">
          Укажите ключ в URL: <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs">/admin?key=…</code>
        </p>
      </div>
    );
  }

  return <AdminVideosApp />;
}
