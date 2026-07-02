import { redirect } from "next/navigation";

export default async function AdminIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const secret = process.env.ADMIN_SECRET?.trim();
  const params = await searchParams;

  if (secret && params.key !== secret) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium text-zinc-800">Доступ ограничен</p>
        <p className="max-w-md text-sm text-zinc-500">
          Укажите ключ: <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs">/admin?key=…</code>
        </p>
      </div>
    );
  }

  const q = params.key ? `?key=${encodeURIComponent(params.key)}` : "";
  redirect(`/admin/overview${q}`);
}
