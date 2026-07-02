import { MyBillingPanel } from "@/components/dashboard/billing-panels";

export const metadata = {
  title: "Мой тариф — Viral",
};

export default function BillingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-zinc-900">Мой тариф</h1>
      <p className="mt-1 text-sm text-zinc-500">Подписка, баланс токенов и история операций</p>
      <div className="mt-6">
        <MyBillingPanel />
      </div>
    </main>
  );
}
