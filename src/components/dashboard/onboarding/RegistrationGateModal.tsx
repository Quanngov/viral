"use client";

import { DashboardModal } from "@/components/dashboard/DashboardModal";
import { REGISTRATION_VALUE_MESSAGE } from "@/lib/onboarding/onboarding-types";

type RegistrationGateModalProps = {
  open: boolean;
  onClose: () => void;
  onSignUp: () => void;
  onLogin: () => void;
};

export function RegistrationGateModal({
  open,
  onClose,
  onSignUp,
  onLogin,
}: RegistrationGateModalProps) {
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Создайте аккаунт"
      placement="center"
      compact
      backdropBlur
    >
      <p className="text-sm leading-relaxed text-zinc-700">{REGISTRATION_VALUE_MESSAGE}</p>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onSignUp}
          className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Создать аккаунт
        </button>
        <button
          type="button"
          onClick={onLogin}
          className="w-full rounded-xl border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
        >
          Войти
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-xs font-medium text-zinc-500 hover:text-zinc-700"
        >
          Позже
        </button>
      </div>
    </DashboardModal>
  );
}
