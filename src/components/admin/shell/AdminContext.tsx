"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { adminHref } from "@/components/admin/shell/admin-nav-config";

type AdminContextValue = {
  adminKey: string | null;
  appendKey: (pathWithQuery: string) => string;
  href: (path: string) => string;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const adminKey = searchParams.get("key");

  const appendKey = useCallback(
    (pathWithQuery: string) => adminHref(pathWithQuery, adminKey),
    [adminKey],
  );

  const href = useCallback((path: string) => adminHref(path, adminKey), [adminKey]);

  const value = useMemo(
    () => ({ adminKey, appendKey, href }),
    [adminKey, appendKey, href],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
