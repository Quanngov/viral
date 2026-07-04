"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useToast } from "@/components/dashboard/ToastContext";
import { useAuthGateOptional } from "@/components/dashboard/AuthGateProvider";
import type { GridVideo } from "@/lib/mock-data";
import { gridVideoToSavePayload, type SaveVideoSourceType } from "@/lib/saved-video-mapper";
import { parseVideoClientId } from "@/lib/video-client-id";
import { invalidateCached } from "@/lib/client-fetch-cache";
import { CACHE_KEYS, loadSavedMap } from "@/lib/dashboard-fetch";
import { peekCached } from "@/lib/client-fetch-cache";

type SavedMap = Record<string, boolean>;

type SavedVideosContextValue = {
  isSaved: (clientId: string) => boolean;
  toggle: (video: GridVideo, opts?: { sourceType?: SaveVideoSourceType; sourceId?: string | null }) => Promise<boolean>;
  refreshFromServer: () => Promise<void>;
  hydrateForVideos: (videos: GridVideo[]) => Promise<void>;
  savedCount: number;
  lastError: string | null;
  clearError: () => void;
  busyClientId: string | null;
  /** Скрыть карточку на вкладке «Сохранённые» сразу после успешного DELETE */
  markRemovedFromSavedList: (clientId: string) => void;
  clearSavedListOptimisticRemovals: () => void;
  isOptimisticallyRemovedFromSavedList: (clientId: string) => boolean;
};

const SavedVideosContext = createContext<SavedVideosContextValue | null>(null);

function toSavedMap(raw: Record<string, boolean>): SavedMap {
  return raw;
}

export function SavedVideosProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const authGate = useAuthGateOptional();
  const [savedMap, setSavedMap] = useState<SavedMap>({});
  const [removedSavedClientIds, setRemovedSavedClientIds] = useState<Set<string>>(() => new Set());
  const [lastError, setLastError] = useState<string | null>(null);
  const [busyClientId, setBusyClientId] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const cached = peekCached<Record<string, boolean>>(CACHE_KEYS.savedMap, 300_000, true);
    if (cached) setSavedMap(toSavedMap(cached));
    return () => {
      mounted.current = false;
    };
  }, []);

  const refreshFromServer = useCallback(async () => {
    const { data: next } = await loadSavedMap();
    if (!mounted.current) return;
    setSavedMap(toSavedMap(next));
  }, []);

  const markRemovedFromSavedList = useCallback((clientId: string) => {
    setRemovedSavedClientIds((prev) => {
      const n = new Set(prev);
      n.add(clientId);
      return n;
    });
  }, []);

  const clearSavedListOptimisticRemovals = useCallback(() => {
    setRemovedSavedClientIds(new Set());
  }, []);

  const isOptimisticallyRemovedFromSavedList = useCallback(
    (clientId: string) => removedSavedClientIds.has(clientId),
    [removedSavedClientIds],
  );

  useEffect(() => {
    void refreshFromServer();
  }, [refreshFromServer]);

  const hydrateForVideos = useCallback(async (videos: GridVideo[]) => {
    const ids = [...new Set(videos.map((v) => v.id).filter(Boolean))];
    if (ids.length === 0) return;
    const chunkSize = 120;
    const merged: SavedMap = {};
    for (let i = 0; i < ids.length; i += chunkSize) {
      const slice = ids.slice(i, i + chunkSize);
      const res = await fetch(`/api/saved-videos/state?ids=${encodeURIComponent(slice.join(","))}`, {
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { saved?: Record<string, boolean> };
      Object.assign(merged, data.saved ?? {});
    }
    if (!mounted.current) return;
    setSavedMap((prev) => ({ ...prev, ...merged }));
  }, []);

  const isSaved = useCallback(
    (clientId: string) => {
      const p = parseVideoClientId(clientId);
      if (!p) return false;
      return Boolean(savedMap[`${p.platform}:${p.externalId}`]);
    },
    [savedMap],
  );

  const performToggle = useCallback(
    async (video: GridVideo, opts?: { sourceType?: SaveVideoSourceType; sourceId?: string | null }) => {
      const clientId = video.id;
      const parsed = parseVideoClientId(clientId);
      if (!parsed) {
        setLastError("Некорректный идентификатор ролика");
        return false;
      }
      const key = `${parsed.platform}:${parsed.externalId}`;
      const was = Boolean(savedMap[key]);
      setLastError(null);
      setBusyClientId(clientId);

      setSavedMap((prev) => {
        const next = { ...prev };
        if (was) delete next[key];
        else next[key] = true;
        return next;
      });

      try {
        if (was) {
          const res = await fetch(
            `/api/saved-videos?platform=${encodeURIComponent(parsed.platform)}&externalId=${encodeURIComponent(parsed.externalId)}`,
            { method: "DELETE" },
          );
          if (!res.ok) throw new Error("delete_failed");
          markRemovedFromSavedList(clientId);
          invalidateCached(CACHE_KEYS.savedList);
          showToast("Ролик удален из сохраненных", "ok");
        } else {
          const payload = gridVideoToSavePayload(video, opts);
          if (!payload) throw new Error("bad_payload");
          const res = await fetch("/api/saved-videos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error("post_failed");
          invalidateCached(CACHE_KEYS.savedList);
          showToast("Ролик сохранен", "ok");
        }
        return true;
      } catch {
        setSavedMap((prev) => {
          const next = { ...prev };
          if (was) next[key] = true;
          else delete next[key];
          return next;
        });
        setLastError("Не удалось обновить сохранение");
        return false;
      } finally {
        if (mounted.current) setBusyClientId(null);
      }
    },
    [savedMap, markRemovedFromSavedList, showToast],
  );

  const toggle = useCallback(
    async (video: GridVideo, opts?: { sourceType?: SaveVideoSourceType; sourceId?: string | null }) => {
      if (authGate && !authGate.isRegistered) {
        authGate.ensureRegistered("save_video", () => performToggle(video, opts));
        return false;
      }
      return performToggle(video, opts);
    },
    [authGate, performToggle],
  );

  const savedCount = useMemo(() => Object.keys(savedMap).filter((k) => savedMap[k]).length, [savedMap]);

  const clearError = useCallback(() => setLastError(null), []);

  const value = useMemo(
    () => ({
      isSaved,
      toggle,
      refreshFromServer,
      hydrateForVideos,
      savedCount,
      lastError,
      clearError,
      busyClientId,
      markRemovedFromSavedList,
      clearSavedListOptimisticRemovals,
      isOptimisticallyRemovedFromSavedList,
    }),
    [
      isSaved,
      toggle,
      refreshFromServer,
      hydrateForVideos,
      savedCount,
      lastError,
      clearError,
      busyClientId,
      markRemovedFromSavedList,
      clearSavedListOptimisticRemovals,
      isOptimisticallyRemovedFromSavedList,
    ],
  );

  return <SavedVideosContext.Provider value={value}>{children}</SavedVideosContext.Provider>;
}

export function useSavedVideos(): SavedVideosContextValue {
  const ctx = useContext(SavedVideosContext);
  if (!ctx) throw new Error("useSavedVideos must be used within SavedVideosProvider");
  return ctx;
}
