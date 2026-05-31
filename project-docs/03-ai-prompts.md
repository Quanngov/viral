# AI Prompts & Boundaries

> Script generation only. Do not paste secrets here.

## Stack

| Piece | Location |
|-------|----------|
| HTTP to DeepSeek | `src/lib/deepseek-generate.ts` |
| Prompt assembly | `src/lib/script-generator-prompt.ts` (`server-only`) |
| Generate route | `src/app/api/script-generator/generate/route.ts` |
| Shared client strings | `src/lib/script-shared-constants.ts` only |
| Token cost | `SCRIPT_GENERATION_TOKEN_COST` env (default 20 in `.env.example`) |

## Environment

```env
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
SCRIPT_GENERATION_TOKEN_COST=20
```

## Request flow

1. Client `ScriptGeneratorSection` → `POST /api/script-generator/generate`
2. Route: `ensureSessionUser` → `spendTokens` → load chat + references from Prisma
3. `buildDeepSeekMessages(profile, messages, referencesPrompt)` → `deepseekChatCompletion`
4. On DB/DeepSeek failure after spend: `creditTokens` (refund)

DeepSeek call: 60s abort timeout, `temperature: 0.55`, `max_tokens: 1800`.

## Prompt policy (summary)

Full text lives in `script-generator-prompt.ts`. Core rules:

- **Role:** experienced editor/copywriter; output must not read as generic AI
- **Banned:** cliché openers, bureaucratic phrasing, empty intensifiers, symmetric “first/second/third” lists
- **Required:** varied sentence length, concrete detail, active voice, strong opening thought
- **Permanent editorial policy:** no filler, conclusions before explanations, authorial stance, uniqueness over volume
- **References:** video transcript/context via `buildReferencesPromptBlock`; ref-only prompt constant `SCRIPT_PROMPT_REF_ONLY`

## Client/server boundary

**Client must NOT import:**

- `@/lib/prisma`
- `script-chat-reference`
- `script-generator-prompt`
- `env-server`

## Related APIs

| Route | Purpose |
|-------|---------|
| `GET/POST /api/script-generator/chats` | Chat list / create |
| `GET/DELETE /api/script-generator/chats/[chatId]` | Chat + messages |
| `POST .../references`, `import-video`, `with-reference` | Attach videos |
| `POST/GET /api/script-generator/profile` | User script profile |

## Operational notes (from audits)

- Generate route loads full message history each call — cost/latency grows with chat length
- No streaming to client today
- Refunds on failure are implemented; spend happens before AI call
