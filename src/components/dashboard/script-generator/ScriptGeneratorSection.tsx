"use client";

import { ArrowUp, ChevronDown, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlatformIcon } from "@/components/dashboard/PlatformIcon";
import { ScriptAssistantMarkdown } from "@/components/dashboard/script-generator/ScriptAssistantMarkdown";
import { formatViewsCount } from "@/lib/format-video";

type ChatSummary = { id: string; title: string; updatedAt: string; createdAt: string };

type Msg = {
  id: string;
  role: string;
  content: string;
  savedVideoId: string | null;
  createdAt: string;
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

export function ScriptGeneratorSection() {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profileText, setProfileText] = useState("");
  const [savedVideos, setSavedVideos] = useState<SavedRow[]>([]);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState<"idle" | "saving" | "saved" | "err">("idle");
  const [importingId, setImportingId] = useState<string | null>(null);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const profileSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const chatMenuRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
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
      const data = (await res.json()) as { messages?: Msg[] };
      setMessages(data.messages ?? []);
      requestAnimationFrame(scrollToBottom);
    },
    [scrollToBottom],
  );

  useEffect(() => {
    void (async () => {
      await Promise.all([loadChats(), loadProfile(), loadSaved()]);
    })();
  }, [loadChats, loadProfile, loadSaved]);

  useEffect(() => {
    if (!selectedChatId) return;
    queueMicrotask(() => {
      void loadChatMessages(selectedChatId);
    });
  }, [selectedChatId, loadChatMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

  const onNewChat = useCallback(async () => {
    setError(null);
    setChatMenuOpen(false);
    const res = await fetch("/api/script-generator/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Новый чат" }),
    });
    if (!res.ok) {
      setError("Не удалось создать чат");
      return;
    }
    const data = (await res.json()) as { chat?: ChatSummary };
    if (!data.chat) return;
    setChats((prev) => [data.chat!, ...prev]);
    setSelectedChatId(data.chat.id);
    setPrompt("");
  }, []);

  const onSelectChat = useCallback((id: string) => {
    if (!id) return;
    setError(null);
    setSelectedChatId(id);
    setPrompt("");
    setChatMenuOpen(false);
  }, []);

  const onImport = useCallback(
    async (savedVideoId: string) => {
      if (!selectedChatId) {
        setError("Сначала выберите или создайте чат");
        return;
      }
      setImportingId(savedVideoId);
      setError(null);
      try {
        const res = await fetch(
          `/api/script-generator/chats/${encodeURIComponent(selectedChatId)}/import-video`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ savedVideoId }),
          },
        );
        const data = (await res.json()) as {
          error?: string;
          message?: { id: string; role: string; content: string; savedVideoId: string | null; createdAt: string };
        };
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Не удалось добавить ролик");
          return;
        }
        if (data.message) {
          setMessages((m) => [...m, data.message!]);
        }
        void loadChats();
      } finally {
        setImportingId(null);
      }
    },
    [selectedChatId, loadChats],
  );

  const onGenerate = useCallback(async () => {
    if (!selectedChatId || !prompt.trim() || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/script-generator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: selectedChatId, prompt: prompt.trim() }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        chatTitle?: string;
      };
      if (!res.ok) {
        setError(data.message ?? (typeof data.error === "string" ? data.error : "Ошибка генерации"));
        return;
      }
      if (data.chatTitle) {
        setChats((prev) => prev.map((c) => (c.id === selectedChatId ? { ...c, title: data.chatTitle! } : c)));
      }
      setPrompt("");
      await loadChatMessages(selectedChatId);
      await loadChats();
    } finally {
      setGenerating(false);
    }
  }, [selectedChatId, prompt, generating, loadChatMessages, loadChats]);

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

  const hasMessages = messages.length > 0;

  const PROFILE_PLACEHOLDER =
    "Например: я занимаюсь видеопродакшеном для экспертов и бизнеса. Помогаю через Reels/Shorts привлекать клиентов. В конце ролика обычно призываю написать мне в Telegram. Стиль — уверенный, живой, без канцелярита. Нельзя обещать гарантированный результат.";

  return (
    <div className="flex h-full min-h-0 max-h-full flex-1 flex-col gap-3 overflow-hidden px-4 pb-3 pt-3 sm:px-6 sm:pt-4 sm:pb-4">
      <h1 className="shrink-0 text-xl font-semibold leading-snug tracking-tight text-zinc-900 sm:text-2xl sm:leading-snug">
        Генерация сценариев
      </h1>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row lg:items-stretch">
        {/* Чат */}
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-sm shadow-zinc-900/5 lg:max-w-[50%] lg:flex-[1]">
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
                {chats.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={c.id === selectedChatId}
                    onClick={() => onSelectChat(c.id)}
                    className={`flex w-full items-center px-3 py-2 text-left text-sm ${
                      c.id === selectedChatId ? "bg-emerald-50 font-medium text-emerald-950" : "text-zinc-800 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="truncate">{c.title}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => void onNewChat()}
                  className="flex w-full items-center border-t border-zinc-100 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  Новый чат
                </button>
              </div>
            ) : null}
          </div>

          <div
            ref={scrollRef}
            className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:thin]"
          >
            {error ? (
              <div className="script-msg-enter rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {error}
              </div>
            ) : null}

            {!hasMessages && !generating ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-4 py-8 text-center">
                <p className="max-w-md text-sm leading-relaxed text-zinc-500">
                  Напишите, про что нужен сценарий. Справа можно добавить информацию о себе и выбрать референс из сохраненных
                  роликов.
                </p>
                <button
                  type="button"
                  onClick={() => void onNewChat()}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
                >
                  Новый чат
                </button>
              </div>
            ) : hasMessages ? (
              messages.map((m) => {
                  if (m.role === "system" && m.savedVideoId) {
                    return (
                      <div
                        key={m.id}
                        className="script-msg-enter self-start max-w-[95%] min-w-0 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs leading-relaxed text-amber-950"
                      >
                        <p className="font-semibold text-amber-900/90">Ролик из сохранённых</p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-amber-950/90">{m.content}</p>
                      </div>
                    );
                  }
                  if (m.role === "assistant") {
                    return (
                      <div
                        key={m.id}
                        className="script-msg-enter self-start max-w-[95%] min-w-0 rounded-2xl border border-zinc-200 bg-zinc-50/90 px-4 py-3 text-zinc-900"
                      >
                        <ScriptAssistantMarkdown content={m.content} className="min-w-0" />
                      </div>
                    );
                  }
                  if (m.role === "user") {
                    return (
                      <div
                        key={m.id}
                        className="script-msg-enter self-end max-w-[95%] min-w-0 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm leading-relaxed text-zinc-900"
                      >
                        <div className="whitespace-pre-wrap break-words">{m.content}</div>
                      </div>
                    );
                  }
                  return (
                    <div key={m.id} className="script-msg-enter text-xs text-zinc-500">
                      [{m.role}]
                    </div>
                  );
                })
            ) : null}

            {generating ? (
              <div
                className={`flex shrink-0 ${!hasMessages ? "min-h-0 flex-1 flex-col items-center justify-center py-8" : ""}`}
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

          <div className="mt-3 shrink-0 border-t border-zinc-100 pt-3">
            <div className="flex items-end gap-2 rounded-2xl border border-zinc-200 bg-zinc-50/90 p-2 shadow-sm shadow-zinc-900/5">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
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
                  disabled={!selectedChatId || !prompt.trim() || generating}
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

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto lg:max-w-[50%] lg:flex-[1] lg:overflow-hidden">
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
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
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
                        disabled={!selectedChatId || importingId === v.id}
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
    </div>
  );
}
