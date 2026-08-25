# AI Integration

> Объединяет `project-docs/03-ai-prompts.md` и код транскрипции.

## Script Generator (DeepSeek)

### Stack

| Piece | Location |
|-------|----------|
| HTTP client | `src/lib/deepseek-generate.ts` |
| Prompt assembly | `src/lib/script-generator-prompt.ts` (`server-only`) |
| Config | `src/lib/script-generator-config.ts` |
| Generate route | `src/app/api/script-generator/generate/route.ts` |
| Client strings | `src/lib/script-shared-constants.ts` |

### Environment

| Variable | Default (`.env.example`) |
|----------|--------------------------|
| `DEEPSEEK_API_KEY` | — |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | `deepseek-v4-flash` |
| `SCRIPT_GENERATION_TOKEN_COST` | `20` |

**Note:** `billing.config.ts` uses **25 tokens** for SCRIPT action — canonical for billing UI; env overrides generate route cost.

### Request flow

1. Client → `POST /api/script-generator/generate`
2. `ensureSessionUser` → `spendTokens` → load chat + references from Prisma
3. `buildDeepSeekMessages()` → `deepseekChatCompletion()`
4. On failure after spend: `creditTokens` (refund)

Parameters: 60s timeout, `temperature: 0.55`, `max_tokens: 1800`.

### Prompt policy (summary)

Full text in `script-generator-prompt.ts`:
- Role: experienced editor/copywriter
- Banned clichés and generic AI phrasing
- References: video transcript via `buildReferencesPromptBlock`

### Related APIs

| Route | Purpose |
|-------|---------|
| `GET/POST /api/script-generator/chats` | List / create |
| `GET/DELETE .../chats/[chatId]` | Chat + messages |
| `POST .../references`, `import-video`, `with-reference` | Attach videos |
| `GET/POST /api/script-generator/profile` | Script user profile |

### Limitations (factual)

- **No streaming** to client
- Full chat history loaded each generate call
- Generate route not wrapped in `withApiRoute`

---

## Transcription (Groq Whisper)

**Route:** `POST /api/videos/transcribe`

| Variable | In `.env.example` |
|----------|-------------------|
| `GROQ_API_KEY` | **No** (code only) |
| `GROQ_WHISPER_MODEL` | code only |

- Primary: subtitles when available on video
- Fallback: Groq Whisper (120s fetch timeout)
- Token cost: **10** (`BILLING_ACTION_COSTS.TRANSCRIBE`)
- Stores result on `Video.transcriptText`, `transcriptStatus`, etc.

---

## AI Profile Analysis (stub)

**Route:** `POST /api/user/profile/ai-analysis`

- Requires PRO+ plan feature `aiProfileAnalysis`
- Token cost: `AI_PROFILE_ANALYSIS_TOKEN_COST` (500 in profile-types)
- Creates `UserProfileAiAnalysis` with `status: pending`
- **Report generation not implemented** (comment in route: "Architecture stub")

---

## Client/server boundary

Client must **NOT** import:
- `@/lib/prisma`
- `script-chat-reference`
- `script-generator-prompt`
- `env-server`

## Observability

- Sentry + `logAdminEvent` on AI paths
- Admin prompts: `/api/admin/prompts`

## Связанные документы

- [[features]]
- [[backend]]
- [[architecture-decisions]]
