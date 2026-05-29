"use client";

import { ArrowDown, ArrowUp, ChevronDown, Copy, ExternalLink, Loader2, Plus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlatformIcon } from "@/components/dashboard/PlatformIcon";
import { ScriptAssistantMarkdown } from "@/components/dashboard/script-generator/ScriptAssistantMarkdown";
import { DashboardModal } from "@/components/dashboard/DashboardModal";
import { formatViewsCount } from "@/lib/format-video";
import { messageForHttpStatus, sanitizeClientErrorMessage } from "@/lib/api-user-messages";
import {
  SCRIPT_PROMPT_REF_ONLY,
  SCRIPT_REF_DUPLICATE_MESSAGE,
  SCRIPT_REF_LIMIT_MESSAGE,
} from "@/lib/script-shared-constants";
import { useToast } from "@/components/dashboard/ToastContext";

type ChatSummary = { id: string; title: string; updatedAt: string; createdAt: string };

type Msg = {
  id: string;
  role: string;
  content: string;
  savedVideoId: string | null;
  createdAt: string;
};

type RefRow = {
  id: string;
  platform: string;
  externalId: string;
  title: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  url: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
  views: number;
  rating: number;
  durationSeconds: number | null;
  hasTranscript: boolean;
  transcriptSource: string | null;
  transcriptText: string | null;
};

type ApiProfile = {
  profileText?: string;
  occupation?: string;
  targetAudience?: string;
  tone?: string;
  cta?: string;
  restrictions?: string;
};

type SavedRow = {
  id: string;
  platform: string;
  title: string;
  thumbnailUrl: string | null;
  authorDisplayName: string | null;
  authorUsername: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  rating: number | null;
};

function platformUi(p: string): "youtube" | "instagram" | "tiktok" {
  if (p === "instagram") return "instagram";
  if (p === "tiktok") return "tiktok";
  return "youtube";
}

function mergeProfileForEditor(p: ApiProfile): string {
  if (p.profileText?.trim()) return p.profileText;
  const bits = [
    p.occupation?.trim(),
    p.targetAudience?.trim(),
    p.tone?.trim(),
    p.cta?.trim(),
    p.restrictions?.trim(),
  ].filter(Boolean);
  return bits.join("\n\n");
}

/** Отображаемая стоимость; совпадает с дефолтом `getScriptGenerationTokenCost` на сервере (20). */
const SCRIPT_GENERATION_UI_COST = 20;

function ScriptReferenceCard({
  item,
  onRemove,
  removing,
}: {
  item: RefRow;
  onRemove: () => void;
  removing?: boolean;
}) {
  const pf = platformUi(item.platform);
  const author = item.authorDisplayName?.trim() || item.authorUsername?.trim() || "—";
  return (
    <div className="script-msg-enter group/reference w-full max-w-[95%] self-start rounded-2xl border border-emerald-100/90 bg-gradient-to-br from-white to-emerald-50/35 p-3 shadow-sm ring-1 ring-zinc-100">
      <div className="flex gap-3">
        <div className="relative h-[4.5rem] w-[4rem] shrink-0 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200/80">
          {item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">Нет превью</div>
          )}
          <span className="pointer-events-none absolute -bottom-0.5 -left-0.5 z-10 drop-shadow">
            <PlatformIcon platform={pf} size={20} className="block" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Референс добавлен</p>
          <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-zinc-900">{item.title}</p>
          <p className="mt-1 text-xs text-zinc-600">
            <span className="font-medium text-zinc-800">{author}</span>
            <span className="text-zinc-500"> · {formatViewsCount(item.views)} просмотров</span>
            <span className="text-zinc-500"> · оценка {item.rating}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-900 shadow-sm transition-colors hover:bg-emerald-50"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Открыть ролик
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          className="shrink-0 self-start rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/80 hover:text-zinc-700 disabled:opacity-40 max-lg:opacity-100 lg:opacity-0 lg:group-hover/reference:opacity-100"
          aria-label="Удалить референс"
        >
          {removing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      <div className="mt-3 rounded-xl border border-zinc-100 bg-white/70 p-2.5 shadow-inner shadow-zinc-900/[0.02]">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Текст ролика</p>
        <div className="scrollbar-hidden max-h-[9rem] min-h-[2.75rem] overflow-y-auto rounded-lg border border-zinc-100/90 bg-zinc-50/95 px-2.5 py-2 text-xs leading-relaxed text-zinc-800">
          {item.transcriptText?.trim() ? (
            <p className="whitespace-pre-wrap break-words">{item.transcriptText}</p>
          ) : (
            <p className="text-zinc-500">Текст ролика пока не получен</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TokenSpark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13.75 2.75 6.5 13h4.75L10.25 21.25 17.5 11h-4.75l1-8.25Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type ScriptGeneratorSectionProps = {
  active?: boolean;
};

export function ScriptGeneratorSection({ active = true }: ScriptGeneratorSectionProps) {
  const { showToast } = useToast();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [references, setReferences] = useState<RefRow[]>([]);
  const [profileText, setProfileText] = useState("");
  const [savedVideos, setSavedVideos] = useState<SavedRow[]>([]);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState<"idle" | "saving" | "saved" | "err">("idle");
  const [importingId, setImportingId] = useState<string | null>(null);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [deletingChat, setDeletingChat] = useState(false);
  const [pendingImportSavedId, setPendingImportSavedId] = useState<string | null>(null);
  const [removingRefId, setRemovingRefId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const profileSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const CHAT_BOTTOM_THRESHOLD_PX = 72;

  const updateScrollDownVisibility = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setShowScrollDown(false);
      return;
    }
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distance <= CHAT_BOTTOM_THRESHOLD_PX;
    const hasOverflow = el.scrollHeight > el.clientHeight + 8;
    setShowScrollDown(hasOverflow && !atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    queueMicrotask(updateScrollDownVisibility);
  }, [updateScrollDownVisibility]);

  const scrollChatToBottomSmooth = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  const loadSaved = useCallback(async () => {
    const res = await fetch("/api/saved-videos", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { videos?: SavedRow[] };
    setSavedVideos(data.videos ?? []);
  }, []);

  const loadChats = useCallback(async () => {
    const res = await fetch("/api/script-generator/chats", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { chats?: ChatSummary[] };
    setChats(data.chats ?? []);
  }, []);

  const loadProfile = useCallback(async () => {
    const res = await fetch("/api/script-generator/profile", { cache: "no-store" });
    if (!res.ok) {
      setProfileReady(true);
      return;
    }
    const data = (await res.json()) as { profile?: ApiProfile };
    if (data.profile) {
      setProfileText(mergeProfileForEditor(data.profile));
    }
    setProfileReady(true);
  }, []);

  const loadChatMessages = useCallback(
    async (chatId: string) => {
      const res = await fetch(`/api/script-generator/chats/${encodeURIComponent(chatId)}`, { cache: "no-store" });
      if (!res.ok) {
        setError("Не удалось загрузить чат");
        return;
      }
      const data = (await res.json()) as { messages?: Msg[]; references?: RefRow[] };
      setMessages(data.messages ?? []);
      setReferences(data.references ?? []);
      requestAnimationFrame(scrollToBottom);
    },
    [scrollToBottom],
  );

  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    const id = window.setTimeout(() => {
      void Promise.all([loadChats(), loadProfile(), loadSaved()]);
    }, 500);
    return () => window.clearTimeout(id);
  }, [active, loadChats, loadProfile, loadSaved]);

  useEffect(() => {
    if (!selectedChatId) return;
    queueMicrotask(() => {
      void loadChatMessages(selectedChatId);
    });
  }, [selectedChatId, loadChatMessages]);

  useEffect(() => {
    scrollToBottom();
    const id = requestAnimationFrame(() => updateScrollDownVisibility());
    return () => cancelAnimationFrame(id);
  }, [messages, references, generating, scrollToBottom, updateScrollDownVisibility]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollDownVisibility();
    el.addEventListener("scroll", updateScrollDownVisibility, { passive: true });
    const ro = new ResizeObserver(() => updateScrollDownVisibility());
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollDownVisibility);
      ro.disconnect();
    };
  }, [updateScrollDownVisibility, selectedChatId, messages, references, generating, notice, error]);

  useEffect(() => {
    if (!chatMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
        setChatMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [chatMenuOpen]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    const processIntent = async () => {
      let raw: string | null = null;
      try {
        raw = sessionStorage.getItem("viral_script_reference_intent");
      } catch {
        return;
      }
      if (!raw?.trim()) return;
      try {
        sessionStorage.removeItem("viral_script_reference_intent");
        const payload = JSON.parse(raw) as {
          title?: string;
          videoId?: string;
          savedVideoId?: string;
          competitorVideoId?: string;
        };
        const title =
          typeof payload.title === "string" && payload.title.trim()
            ? payload.title.trim().slice(0, 120)
            : "Новый чат";
        const body: Record<string, string> = { title };
        if (payload.savedVideoId) body.savedVideoId = payload.savedVideoId;
        else if (payload.competitorVideoId) body.competitorVideoId = payload.competitorVideoId;
        else if (payload.videoId) body.videoId = payload.videoId;
        else return;

        setError(null);
        setNotice(null);
        const res = await fetch("/api/script-generator/chats/with-reference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as {
          error?: string;
          code?: string;
          message?: string;
          chat?: ChatSummary;
          duplicate?: boolean;
        };
        if (!res.ok || !data.chat) {
          setError(typeof data.message === "string" ? data.message : "Не удалось создать чат с референсом");
          return;
        }
        setChats((prev) => [data.chat!, ...prev]);
        setSelectedChatId(data.chat.id);
        setPrompt("");
        if (data.duplicate) {
          showToast(SCRIPT_REF_DUPLICATE_MESSAGE, "warn");
        }
        await loadChatMessages(data.chat.id);
        await loadChats();
      } catch {
        setError("Не удалось обработать переход из ролика");
      }
    };

    void processIntent();
    const onIntent = () => {
      void processIntent();
    };
    window.addEventListener("viral-script-reference-intent", onIntent);
    return () => window.removeEventListener("viral-script-reference-intent", onIntent);
  }, [loadChatMessages, loadChats, showToast]);

  const persistProfile = useCallback(async (text: string) => {
    setProfileSaved("saving");
    const res = await fetch("/api/script-generator/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileText: text }),
    });
    if (!res.ok) {
      setProfileSaved("err");
      return;
    }
    setProfileSaved("saved");
    window.setTimeout(() => setProfileSaved("idle"), 2000);
  }, []);

  useEffect(() => {
    if (!profileReady) return;
    if (profileSaveTimer.current) clearTimeout(profileSaveTimer.current);
    profileSaveTimer.current = setTimeout(() => {
      void persistProfile(profileText);
    }, 1000);
    return () => {
      if (profileSaveTimer.current) clearTimeout(profileSaveTimer.current);
    };
  }, [profileText, profileReady, persistProfile]);

  const onNewChat = useCallback(async (): Promise<string | null> => {
    setError(null);
    setNotice(null);
    setChatMenuOpen(false);
    const res = await fetch("/api/script-generator/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Новый чат" }),
    });
    if (!res.ok) {
      setError("Не удалось создать чат");
      return null;
    }
    const data = (await res.json()) as { chat?: ChatSummary };
    if (!data.chat) return null;
    setChats((prev) => [data.chat!, ...prev]);
    setSelectedChatId(data.chat.id);
    setMessages([]);
    setReferences([]);
    setPrompt("");
    return data.chat.id;
  }, []);

  const onSelectChat = useCallback((id: string) => {
    if (!id) return;
    setError(null);
    setNotice(null);
    setSelectedChatId(id);
    setPrompt("");
    setChatMenuOpen(false);
  }, []);

  const hasUserAssistant = useMemo(
    () => messages.some((m) => m.role === "user" || m.role === "assistant"),
    [messages],
  );

  const ensureChatId = useCallback(async (): Promise<string | null> => {
    if (selectedChatId) return selectedChatId;
    return onNewChat();
  }, [selectedChatId, onNewChat]);

  const importSavedVideoToChat = useCallback(
    async (chatId: string, savedVideoId: string) => {
      const res = await fetch(`/api/script-generator/chats/${encodeURIComponent(chatId)}/import-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savedVideoId }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        message?: string;
        duplicate?: boolean;
        replaced?: boolean;
        reference?: RefRow;
      };
      if (!res.ok) {
        if (res.status === 409 && data.code === "has_history") {
          setPendingImportSavedId(savedVideoId);
          return false;
        }
        if (res.status === 409 && data.code === "ref_limit") {
          showToast(typeof data.message === "string" ? data.message : SCRIPT_REF_LIMIT_MESSAGE, "warn");
          return false;
        }
        setError(typeof data.message === "string" ? data.message : "Не удалось добавить ролик");
        return false;
      }
      if (data.duplicate) {
        showToast(SCRIPT_REF_DUPLICATE_MESSAGE, "warn");
        await loadChatMessages(chatId);
        return true;
      }
      showToast(data.replaced ? "Референс заменён" : "Референс добавлен", "ok");
      await loadChatMessages(chatId);
      void loadChats();
      return true;
    },
    [loadChatMessages, loadChats, showToast],
  );

  const onImport = useCallback(
    async (savedVideoId: string) => {
      if (hasUserAssistant) {
        setPendingImportSavedId(savedVideoId);
        return;
      }
      setImportingId(savedVideoId);
      setError(null);
      setNotice(null);
      try {
        const chatId = await ensureChatId();
        if (!chatId) {
          setError("Не удалось создать чат");
          return;
        }
        await importSavedVideoToChat(chatId, savedVideoId);
      } finally {
        setImportingId(null);
      }
    },
    [ensureChatId, hasUserAssistant, importSavedVideoToChat],
  );

  const onRemoveReference = useCallback(
    async (referenceId: string) => {
      if (!selectedChatId) return;
      setRemovingRefId(referenceId);
      setError(null);
      try {
        const res = await fetch(
          `/api/script-generator/chats/${encodeURIComponent(selectedChatId)}/references/${encodeURIComponent(referenceId)}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          setError("Не удалось удалить референс");
          return;
        }
        setReferences([]);
        showToast("Референс удалён", "ok");
      } finally {
        setRemovingRefId(null);
      }
    },
    [selectedChatId, showToast],
  );

  const onCreateNewChatWithPendingVideo = useCallback(async () => {
    const savedVideoId = pendingImportSavedId;
    setPendingImportSavedId(null);
    if (!savedVideoId) return;
    setImportingId(savedVideoId);
    setError(null);
    try {
      const res = await fetch("/api/script-generator/chats/with-reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Новый чат", savedVideoId }),
      });
      const data = (await res.json()) as { chat?: ChatSummary; message?: string };
      if (!res.ok || !data.chat) {
        setError(typeof data.message === "string" ? data.message : "Не удалось создать чат");
        return;
      }
      setChats((prev) => [data.chat!, ...prev]);
      setSelectedChatId(data.chat.id);
      setPrompt("");
      await loadChatMessages(data.chat.id);
      void loadChats();
      showToast("Новый чат с референсом создан", "ok");
    } finally {
      setImportingId(null);
    }
  }, [pendingImportSavedId, loadChatMessages, loadChats, showToast]);

  const confirmDeleteChat = useCallback(async () => {
    const chatId = chatToDelete;
    if (!chatId || deletingChat) return;
    setDeletingChat(true);
    setError(null);
    try {
      const res = await fetch(`/api/script-generator/chats/${encodeURIComponent(chatId)}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Не удалось удалить чат");
        return;
      }
      const idx = chats.findIndex((c) => c.id === chatId);
      const remaining = chats.filter((c) => c.id !== chatId);
      setChats(remaining);
      setChatToDelete(null);
      setChatMenuOpen(false);

      if (chatId !== selectedChatId) return;

      if (remaining.length > 0) {
        const neighbor = remaining[Math.min(idx, remaining.length - 1)] ?? remaining[0];
        setSelectedChatId(neighbor.id);
        setPrompt("");
        return;
      }

      setSelectedChatId(null);
      setMessages([]);
      setReferences([]);
      await onNewChat();
    } finally {
      setDeletingChat(false);
    }
  }, [chatToDelete, deletingChat, chats, selectedChatId, onNewChat]);

  const onGenerate = useCallback(async () => {
    if (!selectedChatId || generating) return;
    const promptTrim = prompt.trim();
    if (!promptTrim && references.length === 0) return;

    const storedContent = promptTrim || SCRIPT_PROMPT_REF_ONLY;
    const optimisticId = `opt-${Date.now()}`;
    const optimisticMsg: Msg = {
      id: optimisticId,
      role: "user",
      content: storedContent,
      savedVideoId: null,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setPrompt("");
    setGenerating(true);
    setError(null);
    setNotice(null);
    requestAnimationFrame(scrollToBottom);

    try {
      const res = await fetch("/api/script-generator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: selectedChatId, prompt: promptTrim }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        chatTitle?: string;
      };
      if (!res.ok) {
        if (res.status === 402) {
          showToast(messageForHttpStatus(402, data.message), "warn");
        }
        setError(
          sanitizeClientErrorMessage(
            typeof data.message === "string" ? data.message : typeof data.error === "string" ? data.error : "",
          ) || "Ошибка генерации",
        );
        await loadChatMessages(selectedChatId);
        return;
      }
      showToast("Сценарий готов", "ok");
      if (data.chatTitle) {
        setChats((prev) => prev.map((c) => (c.id === selectedChatId ? { ...c, title: data.chatTitle! } : c)));
      }
      await loadChatMessages(selectedChatId);
      await loadChats();
    } finally {
      setGenerating(false);
    }
  }, [
    selectedChatId,
    prompt,
    generating,
    references.length,
    loadChatMessages,
    loadChats,
    showToast,
    scrollToBottom,
  ]);

  useEffect(() => {
    if (selectedChatId) return;
    if (chats.length === 0) return;
    queueMicrotask(() => {
      setSelectedChatId(chats[0].id);
    });
  }, [chats, selectedChatId]);

  const currentChatTitle = useMemo(() => {
    if (!selectedChatId) return chats.length ? "Выберите чат" : "Нет чатов";
    return chats.find((c) => c.id === selectedChatId)?.title ?? "Чат";
  }, [chats, selectedChatId]);

  const showDefaultEmpty = references.length === 0 && !hasUserAssistant && !generating;
  const showReferenceOnlyHint = references.length > 0 && !hasUserAssistant && !generating;

  const PROFILE_PLACEHOLDER =
    "Например: я занимаюсь видеопродакшеном для экспертов и бизнеса. Помогаю через Reels/Shorts привлекать клиентов. В конце ролика обычно призываю написать мне в Telegram. Стиль — уверенный, живой, без канцелярита. Нельзя обещать гарантированный результат.";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-visible px-3 pb-24 pt-3 lg:h-full lg:max-h-full lg:overflow-hidden lg:px-6 lg:pb-4 lg:pt-4">
      <h1 className="shrink-0 text-xl font-semibold leading-snug tracking-tight text-zinc-900 sm:text-2xl sm:leading-snug">
        Генерация сценариев
      </h1>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-visible lg:flex-row lg:items-stretch lg:gap-4 lg:overflow-hidden">
        {/* Чат */}
        <section className="flex min-h-[min(70vh,520px)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-sm shadow-zinc-900/5 lg:min-h-0 lg:max-w-[50%] lg:flex-[1]">
          <div ref={chatMenuRef} className="relative shrink-0 border-b border-zinc-100 pb-3">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setChatMenuOpen((o) => !o)}
                className="flex max-w-[min(100%,18rem)] items-center justify-center gap-1.5 rounded-lg px-2 py-0.5 text-center text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
                aria-expanded={chatMenuOpen}
                aria-haspopup="listbox"
              >
                <span className="min-w-0 truncate">{currentChatTitle}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${chatMenuOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>
            {chatMenuOpen ? (
              <div
                role="listbox"
                className="absolute left-1/2 top-full z-20 mt-1 max-h-64 w-max min-w-[min(18rem,calc(100vw-2rem))] max-w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg shadow-zinc-900/10"
              >
                <button
                  type="button"
                  onClick={() => void onNewChat()}
                  className="flex w-full items-center gap-2 border-b border-zinc-100 px-3 py-2.5 text-left text-sm font-medium text-emerald-800 hover:bg-emerald-50/80"
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  Создать новый чат
                </button>
                {chats.map((c) => (
                  <div key={c.id} className="group/chat flex w-full items-center">
                    <button
                      type="button"
                      role="option"
                      aria-selected={c.id === selectedChatId}
                      onClick={() => onSelectChat(c.id)}
                      className={`min-w-0 flex-1 px-3 py-2 text-left text-sm ${
                        c.id === selectedChatId
                          ? "bg-emerald-50 font-medium text-emerald-950"
                          : "text-zinc-800 hover:bg-zinc-50"
                      }`}
                    >
                      <span className="block truncate">{c.title}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatToDelete(c.id);
                      }}
                      className="mr-1.5 shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 max-lg:opacity-100 lg:opacity-0 lg:group-hover/chat:opacity-100"
                      aria-label={`Удалить чат «${c.title}»`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative mt-3 flex min-h-0 flex-1 flex-col">
            <div
              ref={scrollRef}
              className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-0.5"
            >
            {references.map((r) => (
              <ScriptReferenceCard
                key={r.id}
                item={r}
                removing={removingRefId === r.id}
                onRemove={() => void onRemoveReference(r.id)}
              />
            ))}

            {notice ? (
              <div className="script-msg-enter rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">
                {notice}
              </div>
            ) : null}

            {error ? (
              <div className="script-msg-enter rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {error}
              </div>
            ) : null}

            {showDefaultEmpty ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-4 py-8 text-center">
                <p className="max-w-md text-base font-semibold text-zinc-800">Напишите, какой сценарий хотите получить</p>
                <p className="max-w-md text-sm leading-relaxed text-zinc-600">
                  Можно добавить информацию о себе справа или прикрепить сохраненный ролик как референс.
                </p>
                <button
                  type="button"
                  onClick={() => void onNewChat()}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
                >
                  Новый чат
                </button>
              </div>
            ) : null}

            {showReferenceOnlyHint ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-center text-sm leading-relaxed text-emerald-950">
                Референс добавлен. Напишите, какой сценарий хотите получить на основе этого ролика.
              </div>
            ) : null}

            {hasUserAssistant
              ? messages.map((m) => {
                  if (m.role === "system" && m.savedVideoId) {
                    return (
                      <div
                        key={m.id}
                        className="script-msg-enter self-start max-w-[95%] min-w-0 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs leading-relaxed text-amber-950"
                      >
                        <p className="font-semibold text-amber-900/90">Ролик из сохранённых (старый импорт)</p>
                        <p className="mt-1 line-clamp-6 whitespace-pre-wrap break-words text-amber-950/90">{m.content}</p>
                      </div>
                    );
                  }
                  if (m.role === "assistant") {
                    return (
                      <div key={m.id} className="script-msg-enter w-full max-w-[95%] self-start min-w-0">
                        <div className="mb-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              void (async () => {
                                try {
                                  await navigator.clipboard.writeText(m.content);
                                  showToast("Сценарий скопирован", "ok");
                                } catch {
                                  showToast("Не удалось скопировать", "warn");
                                }
                              })();
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
                          >
                            <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Копировать
                          </button>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/90 px-4 py-3 text-zinc-900">
                          <ScriptAssistantMarkdown content={m.content} className="min-w-0" />
                        </div>
                      </div>
                    );
                  }
                  if (m.role === "user") {
                    const isRefOnly = m.content === SCRIPT_PROMPT_REF_ONLY;
                    return (
                      <div
                        key={m.id}
                        className="script-msg-enter self-end max-w-[95%] min-w-0 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm leading-relaxed text-zinc-900"
                      >
                        {isRefOnly ? (
                          <p className="text-sm text-emerald-950">
                            <span className="font-semibold">Запрос по референсу</span>
                            <span className="text-zinc-600"> — отдельного текста в поле ввода не было.</span>
                          </p>
                        ) : (
                          <div className="whitespace-pre-wrap break-words">{m.content}</div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div key={m.id} className="script-msg-enter text-xs text-zinc-500">
                      [{m.role}]
                    </div>
                  );
                })
              : null}

            {generating ? (
              <div
                className={`flex shrink-0 ${
                  !hasUserAssistant && references.length === 0 ? "min-h-0 flex-1 flex-col items-center justify-center py-8" : ""
                }`}
              >
                <div
                  className="script-msg-enter flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50/95 px-3 py-2.5 text-zinc-600 shadow-sm"
                  aria-live="polite"
                >
                  <span className="text-xs font-medium text-zinc-500">Пишу</span>
                  <span className="flex items-center gap-1" aria-hidden>
                    <span className="script-typing-dot h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="script-typing-dot h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="script-typing-dot h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                </div>
              </div>
            ) : null}
            </div>
            {showScrollDown ? (
              <button
                type="button"
                onClick={() => scrollChatToBottomSmooth()}
                className="absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 text-zinc-600 shadow-md shadow-zinc-900/12 transition-colors hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
                aria-label="Прокрутить к концу чата"
              >
                <ArrowDown className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              </button>
            ) : null}
          </div>

          <div className="mt-3 shrink-0 border-t border-zinc-100 pt-3">
            <div className="flex items-end gap-2 rounded-2xl border border-zinc-200 bg-zinc-50/90 p-2 shadow-sm shadow-zinc-900/5">
              <textarea
                value={prompt}
                onChange={(e) => {
                  setNotice(null);
                  setPrompt(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.shiftKey) return;
                  e.preventDefault();
                  if (!selectedChatId || generating) return;
                  if (!prompt.trim() && references.length === 0) return;
                  void onGenerate();
                }}
                rows={1}
                placeholder="Промпт для сценария…"
                disabled={!selectedChatId || generating}
                className="min-h-[48px] max-h-[120px] min-w-0 flex-1 resize-none overflow-y-auto rounded-xl border-0 bg-transparent px-2.5 py-2.5 text-sm leading-snug text-zinc-900 placeholder:text-zinc-400 outline-none ring-0 focus:ring-0 disabled:opacity-50"
              />
              <div className="flex shrink-0 items-center gap-2 self-end pb-1 pr-1">
                <div
                  className="flex items-center gap-1 text-zinc-500"
                  title={`Стоимость генерации: ${SCRIPT_GENERATION_UI_COST}`}
                >
                  <TokenSpark className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="text-xs font-semibold tabular-nums text-zinc-600">{SCRIPT_GENERATION_UI_COST}</span>
                </div>
                <button
                  type="button"
                  disabled={!selectedChatId || generating || (!prompt.trim() && references.length === 0)}
                  onClick={() => void onGenerate()}
                  aria-label="Сгенерировать сценарий"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-600/25 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {generating ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  ) : (
                    <ArrowUp className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 lg:min-h-0 lg:max-w-[50%] lg:flex-[1] lg:flex-col lg:gap-4 lg:overflow-y-auto lg:overflow-hidden">
          <section className="flex max-h-[40vh] min-h-[180px] flex-col rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-sm shadow-zinc-900/5 lg:flex-[1]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-900">Инфо для сценариев</h2>
              <button
                type="button"
                onClick={() => void persistProfile(profileText)}
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 shadow-sm hover:border-emerald-300 hover:text-emerald-900"
              >
                Сохранить
              </button>
            </div>
            <textarea
              value={profileText}
              onChange={(e) => setProfileText(e.target.value)}
              placeholder={PROFILE_PLACEHOLDER}
              rows={6}
              className="min-h-[10rem] flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
            />
            <p className="mt-2 min-h-[1rem] text-[11px] text-zinc-500">
              {profileSaved === "saving" ? "Сохранение…" : null}
              {profileSaved === "saved" ? <span className="text-emerald-700">Сохранено</span> : null}
              {profileSaved === "err" ? <span className="text-red-600">Ошибка сохранения</span> : null}
            </p>
          </section>

          <section className="flex min-h-[280px] flex-1 flex-col rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-sm shadow-zinc-900/5 lg:flex-[2]">
            <h2 className="mb-3 shrink-0 text-sm font-semibold text-zinc-900">Сохранённые ролики</h2>
            <div className="scrollbar-hidden min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5">
              {savedVideos.length === 0 ? (
                <p className="text-sm text-zinc-500">Пока нет сохранённых роликов</p>
              ) : (
                savedVideos.map((v) => (
                  <div
                    key={v.id}
                    className="flex min-h-[5.5rem] items-stretch gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm"
                  >
                    <div className="relative h-[5.25rem] w-[4.75rem] shrink-0 self-center overflow-visible">
                      <div className="relative h-full w-full overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200/80">
                        {v.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : null}
                      </div>
                      <span className="pointer-events-none absolute -bottom-1 -left-1 z-10 drop-shadow-md">
                        <PlatformIcon platform={platformUi(v.platform)} size={22} className="block" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="flex items-start gap-2">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900">{v.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-zinc-600">
                        <span className="font-medium text-zinc-700">{v.authorDisplayName || v.authorUsername || "—"}</span>
                        {v.views != null ? (
                          <span className="text-zinc-500"> · {formatViewsCount(v.views)} просмотров</span>
                        ) : null}
                        {v.rating != null ? <span className="text-zinc-500"> · оценка {v.rating}</span> : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center self-stretch">
                      <button
                        type="button"
                        disabled={importingId === v.id}
                        onClick={() => void onImport(v.id)}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 disabled:opacity-40"
                      >
                        {importingId === v.id ? "…" : "Добавить"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <DashboardModal
        compact
        open={chatToDelete !== null}
        onClose={() => {
          if (!deletingChat) setChatToDelete(null);
        }}
        title="Удалить этот чат?"
        backdropBlur={false}
      >
        <p className="text-sm text-zinc-600">История сообщений и референсы будут удалены без возможности восстановления.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={deletingChat}
            onClick={() => setChatToDelete(null)}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={deletingChat}
            onClick={() => void confirmDeleteChat()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deletingChat ? "Удаление…" : "Удалить"}
          </button>
        </div>
      </DashboardModal>

      <DashboardModal
        compact
        open={pendingImportSavedId !== null}
        onClose={() => setPendingImportSavedId(null)}
        title="У этого чата уже есть история сообщений"
        subtitle="Что сделать?"
        backdropBlur={false}
      >
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setPendingImportSavedId(null)}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={importingId !== null}
            onClick={() => void onCreateNewChatWithPendingVideo()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Создать новый чат с этим роликом
          </button>
        </div>
      </DashboardModal>
    </div>
  );
}
