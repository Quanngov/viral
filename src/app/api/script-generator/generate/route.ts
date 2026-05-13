import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminEvent, safeMeta } from "@/lib/admin-events";
import { deepseekChatCompletion, DeepSeekError } from "@/lib/deepseek-generate";
import { creditTokens, ensureSessionUser, getTokenBalanceForUser, spendTokens } from "@/lib/token-wallet";
import { getDeepSeekEnv, getScriptGenerationTokenCost } from "@/lib/script-generator-config";
import { USER_MSG } from "@/lib/api-user-messages";
import { buildDeepSeekMessages, buildReferencesPromptBlock, SCRIPT_PROMPT_REF_ONLY } from "@/lib/script-generator-prompt";

export const dynamic = "force-dynamic";

const MAX_PROMPT = 8000;

function nextScriptChatTitle(
  promptTrim: string,
  ref: { title: string; authorUsername: string | null } | undefined,
): string {
  const p = promptTrim.replace(/\s+/g, " ").trim();
  if (p) {
    const short = p.length > 48 ? `${p.slice(0, 46)}…` : p;
    return `Сценарий: ${short}`;
  }
  const u = ref?.authorUsername?.trim();
  if (u) {
    const handle = u.startsWith("@") ? u : `@${u}`;
    return `Сценарий по ${handle}`;
  }
  const t = ref?.title?.trim();
  if (t) {
    return `Сценарий: ${t.length > 40 ? `${t.slice(0, 38)}…` : t}`;
  }
  return "Новый чат";
}

export async function POST(req: Request) {
  const { userId, sessionKey } = await ensureSessionUser();
  const cost = getScriptGenerationTokenCost();
  const started = Date.now();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const chatId = typeof o.chatId === "string" ? o.chatId.trim() : "";
  const promptTrim = typeof o.prompt === "string" ? o.prompt.trim().slice(0, MAX_PROMPT) : "";

  const chat = await prisma.scriptChat.findFirst({
    where: { id: chatId, userId },
  });
  if (!chat) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const refRows = await prisma.scriptChatReference.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
    take: 1,
    include: {
      video: {
        select: {
          transcriptText: true,
          transcriptSource: true,
          durationSeconds: true,
        },
      },
    },
  });
  const refCount = refRows.length;
  const referencesPrompt = buildReferencesPromptBlock(refRows);

  if (!chatId || (!promptTrim && refCount === 0)) {
    return NextResponse.json(
      {
        error: "bad_request",
        message: "Нужен chatId и либо текст запроса, либо прикреплённый референс-ролик.",
      },
      { status: 400 },
    );
  }

  const storedUserContent = promptTrim || SCRIPT_PROMPT_REF_ONLY;

  const importCount = await prisma.scriptMessage.count({
    where: { chatId, role: "system", savedVideoId: { not: null } },
  });

  const assistantBefore = await prisma.scriptMessage.count({
    where: { chatId, role: "assistant" },
  });

  await logAdminEvent({
    level: "info",
    type: "script_generate_start",
    message: "Старт генерации сценария",
    sessionId: sessionKey,
    userId,
    meta: safeMeta({
      chatId,
      userPromptChars: promptTrim.length,
      referencesCount: refCount,
      importedVideosCount: importCount,
      cost,
    }),
  });

  const { apiKey, model } = getDeepSeekEnv();
  if (!apiKey) {
    await logAdminEvent({
      level: "warn",
      type: "script_generate_error",
      message: "Нет DEEPSEEK_API_KEY",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({ chatId, errorKind: "missing_api_key" }),
    });
    return NextResponse.json(
      {
        error: "missing_deepseek",
        message: USER_MSG.deepseekKeyMissing,
      },
      { status: 503 },
    );
  }

  const spend = await spendTokens(userId, cost, "script_generator", { sessionId: sessionKey });
  if (!spend.ok) {
    await logAdminEvent({
      level: "warn",
      type: "script_generate_error",
      message: "Недостаточно токенов",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({ chatId, errorKind: "insufficient_tokens", cost, balance: spend.balance }),
    });
    return NextResponse.json(
      { error: "insufficient_tokens", message: USER_MSG.tokensInsufficient, balance: spend.balance },
      { status: 402 },
    );
  }

  try {
    await prisma.scriptMessage.create({
      data: { chatId, role: "user", content: storedUserContent },
    });
  } catch (e) {
    await creditTokens(userId, cost, "script_generate_refund", { sessionId: sessionKey });
    await logAdminEvent({
      level: "error",
      type: "script_generate_error",
      message: "Не удалось сохранить сообщение пользователя",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({ chatId, errorKind: "db_user_message", ...compactErr(e) }),
    });
    return NextResponse.json({ error: "db_error", message: "Ошибка сохранения чата." }, { status: 500 });
  }

  const profile = await prisma.scriptUserProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const allMessages = await prisma.scriptMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
  });

  const dsMessages = buildDeepSeekMessages(profile, allMessages, referencesPrompt);
  const systemChars = dsMessages[0]?.role === "system" ? dsMessages[0].content.length : 0;
  const historyUsed = dsMessages.length - 1;

  let assistantText: string;
  try {
    const out = await deepseekChatCompletion(dsMessages);
    assistantText = out.text;
  } catch (e) {
    await creditTokens(userId, cost, "script_generate_refund", { sessionId: sessionKey });
    const kind = e instanceof DeepSeekError ? e.kind : "unknown";
    const status = e instanceof DeepSeekError ? e.status : undefined;
    await logAdminEvent({
      level: "warn",
      type: "script_generate_error",
      message: "Ошибка DeepSeek",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({
        chatId,
        errorKind: kind,
        httpStatus: status,
        durationMs: Date.now() - started,
        referencesCount: refCount,
      }),
    });
    const msg =
      kind === "missing_api_key"
        ? USER_MSG.deepseekKeyMissing
        : kind === "http"
          ? "Сервис модели вернул ошибку. Попробуйте позже."
          : kind === "abort"
            ? "Превышено время ожидания ответа."
            : "Не удалось получить ответ модели.";
    return NextResponse.json({ error: "deepseek_failed", message: msg, refunded: true }, { status: 502 });
  }

  await logAdminEvent({
    level: "info",
    type: "script_token_spend",
    message: "Списание за генерацию сценария",
    sessionId: sessionKey,
    userId,
    meta: safeMeta({
      chatId,
      cost,
      model,
      balanceAfter: spend.balance,
      inputCharsApprox: promptTrim.length + systemChars,
      historyMessagesUsed: historyUsed,
      importedVideosCount: importCount,
      referencesCount: refCount,
      durationMs: Date.now() - started,
    }),
  });

  let assistantRow: { id: string; role: string; content: string; createdAt: Date; savedVideoId: string | null };
  try {
    assistantRow = await prisma.scriptMessage.create({
      data: { chatId, role: "assistant", content: assistantText },
    });
    const nextTitle =
      assistantBefore === 0 && (chat.title === "Новый чат" || chat.title.trim() === "Новый чат")
        ? nextScriptChatTitle(promptTrim, refRows[0])
        : chat.title;
    await prisma.scriptChat.update({
      where: { id: chatId },
      data: { title: nextTitle, updatedAt: new Date() },
    });
  } catch (e) {
    await logAdminEvent({
      level: "error",
      type: "script_generate_error",
      message: "Ответ получен, но не сохранён в БД",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({
        chatId,
        errorKind: "db_assistant_message",
        durationMs: Date.now() - started,
        ...compactErr(e),
      }),
    });
    const balance = await getTokenBalanceForUser(userId);
    return NextResponse.json({
      error: "save_partial",
      message: "Сценарий сгенерирован, но не удалось сохранить в историю. Текст ниже.",
      assistantMessage: {
        id: "local",
        role: "assistant",
        content: assistantText,
        savedVideoId: null,
        createdAt: new Date().toISOString(),
      },
      balance,
    });
  }

  const balance = await getTokenBalanceForUser(userId);
  await logAdminEvent({
    level: "info",
    type: "script_generate_success",
    message: "Генерация сценария завершена",
    sessionId: sessionKey,
    userId,
    meta: safeMeta({
      chatId,
      messageId: assistantRow.id,
      model,
      durationMs: Date.now() - started,
      importedVideosCount: importCount,
      cost,
      balanceAfter: balance,
      inputCharsApprox: promptTrim.length + systemChars,
      historyMessagesUsed: historyUsed,
      referencesCount: refCount,
    }),
  });

  return NextResponse.json({
    userMessage: { role: "user", content: storedUserContent },
    assistantMessage: {
      id: assistantRow.id,
      role: assistantRow.role,
      content: assistantRow.content,
      savedVideoId: assistantRow.savedVideoId,
      createdAt: assistantRow.createdAt,
    },
    chatTitle:
      assistantBefore === 0 && (chat.title === "Новый чат" || chat.title.trim() === "Новый чат")
        ? nextScriptChatTitle(promptTrim, refRows[0])
        : chat.title,
    balance,
  });
}

function compactErr(e: unknown): Record<string, unknown> {
  if (e instanceof Error) return { err: e.name, errMsg: e.message.slice(0, 200) };
  return { err: String(e).slice(0, 200) };
}
