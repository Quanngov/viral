"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

const OVERLAY_Z = 200;
const ANCHOR_BACKDROP_Z = 199;

const emptySubscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

function useEscapeClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

export type DashboardModalPlacement = "center" | "drawer-right";

export type DashboardModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  placement?: DashboardModalPlacement;
  wide?: boolean;
  /** drawer: wider panel (сценарии) */
  drawerSize?: "md" | "lg";
  children: ReactNode;
};

export function DashboardModal({
  open,
  onClose,
  title,
  subtitle,
  placement = "center",
  wide,
  drawerSize = "md",
  children,
}: DashboardModalProps) {
  const hydrated = useHydrated();
  const titleId = useId();

  useBodyScrollLock(open);
  useEscapeClose(open, onClose);

  if (!hydrated || typeof document === "undefined") return null;
  if (!open) return null;

  const drawerMax =
    drawerSize === "lg"
      ? "max-w-full sm:max-w-2xl lg:max-w-3xl"
      : "max-w-full sm:max-w-md md:max-w-lg";

  const node = (
    <div className="fixed inset-0" style={{ zIndex: OVERLAY_Z }} role="presentation">
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-black/45 backdrop-blur-[3px] transition-opacity"
        onClick={onClose}
      />
      {placement === "center" ? (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center p-3 sm:p-4">
          <div
            role="dialog"
            aria-modal
            aria-labelledby={titleId}
            className={`pointer-events-auto flex max-h-[calc(100vh-32px)] w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/20 ${
              wide ? "max-w-2xl" : "max-w-md"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader titleId={titleId} title={title} subtitle={subtitle} onClose={onClose} />
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2">{children}</div>
          </div>
        </div>
      ) : (
        <div className="pointer-events-none fixed inset-0 flex justify-end p-0 sm:p-2">
          <div
            role="dialog"
            aria-modal
            aria-labelledby={titleId}
            className={`pointer-events-auto flex h-full max-h-[100dvh] w-full flex-col overflow-hidden border-zinc-200 bg-white shadow-2xl shadow-zinc-900/25 sm:max-h-[calc(100vh-16px)] sm:rounded-2xl sm:border ${drawerMax}`}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader titleId={titleId} title={title} subtitle={subtitle} onClose={onClose} />
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2">{children}</div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(node, document.body);
}

function ModalHeader({
  titleId,
  title,
  subtitle,
  onClose,
}: {
  titleId: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 pb-3 pt-5">
      <div className="min-w-0">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight text-zinc-900">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-xs text-zinc-500">{subtitle}</p> : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-lg bg-zinc-100 p-2 text-zinc-600 transition-colors hover:bg-zinc-200"
        aria-label="Закрыть"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export type DashboardAnchoredLayerProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  /** совпадать по ширине с якорем (меню) */
  matchAnchorWidth?: boolean;
  minWidthPx?: number;
  children: ReactNode;
};

export function DashboardAnchoredLayer({
  open,
  onClose,
  anchorRef,
  matchAnchorWidth = true,
  minWidthPx = 200,
  children,
}: DashboardAnchoredLayerProps) {
  const hydrated = useHydrated();
  const [box, setBox] = useState({ top: 0, left: 0, width: 240 });

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = matchAnchorWidth ? Math.max(r.width, minWidthPx) : Math.max(r.width, minWidthPx);
    let left = r.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    const top = Math.min(r.bottom + 6, window.innerHeight - 8);
    setBox({ top, left, width });
  }, [anchorRef, matchAnchorWidth, minWidthPx]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updatePosition]);

  useEscapeClose(open, onClose);

  if (!hydrated || typeof document === "undefined") return null;
  if (!open) return null;

  const node = (
    <>
      <button
        type="button"
        aria-label="Закрыть"
        className="fixed inset-0 bg-black/25 backdrop-blur-[2px]"
        style={{ zIndex: ANCHOR_BACKDROP_Z }}
        onClick={onClose}
      />
      <div
        className="fixed z-[200] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl shadow-zinc-900/15"
        style={{ top: box.top, left: box.left, width: box.width, maxHeight: "min(70dvh, calc(100vh - 24px))" }}
        onClick={(e) => e.stopPropagation()}
        role="menu"
      >
        <div className="max-h-[min(70dvh,calc(100vh-24px))] overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </>
  );

  return createPortal(node, document.body);
}

export type DashboardAnchoredCardProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/** Небольшая карточка под якорем (профиль) */
export function DashboardAnchoredCard({
  open,
  onClose,
  anchorRef,
  title,
  subtitle,
  children,
}: DashboardAnchoredCardProps) {
  const hydrated = useHydrated();
  const [box, setBox] = useState({ top: 0, left: 0, width: 280 });
  const titleId = useId();

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(280, r.width);
    let left = r.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    const top = Math.min(r.bottom + 6, window.innerHeight - 8);
    setBox({ top, left, width });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updatePosition]);

  useEscapeClose(open, onClose);

  if (!hydrated || typeof document === "undefined") return null;
  if (!open) return null;

  const node = (
    <>
      <button
        type="button"
        aria-label="Закрыть"
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
        style={{ zIndex: ANCHOR_BACKDROP_Z }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        className="fixed z-[200] flex max-h-[min(85dvh,calc(100vh-32px))] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/20"
        style={{ top: box.top, left: box.left, width: box.width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-4 pb-2 pt-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold tracking-tight text-zinc-900">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg bg-zinc-100 p-1.5 text-zinc-600 hover:bg-zinc-200"
            aria-label="Закрыть"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
      </div>
    </>
  );

  return createPortal(node, document.body);
}
