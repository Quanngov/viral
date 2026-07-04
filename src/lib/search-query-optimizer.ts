import "server-only";

import { deepseekChatCompletion, DeepSeekError } from "@/lib/deepseek-generate";
import { logAdminEvent, safeMeta } from "@/lib/admin-events";
import { SEARCH_QUERY_OPTIMIZER_SYSTEM_PROMPT } from "@/lib/search-query-prompt";

export type OptimizedSearchQuery = {
  /** Raw user input */
  userQuery: string;
  /** DeepSeek-optimized query (or user query on fallback) */
  optimizedQuery: string;
  /** Significant tokens for matching */
  terms: string[];
  /** Broader related tokens for expansion tiers */
  relatedTerms: string[];
  source: "deepseek" | "fallback";
};

const MAX_QUERY_LEN = 120;

/** Normalize model output to a single search line. */
export function sanitizeOptimizedQueryOutput(text: string): string {
  let line = text.split("\n")[0]?.trim() ?? "";
  line = line.replace(/^```[\w]*\s*/i, "").replace(/```\s*$/i, "");
  line = line.replace(/^["'`]+|["'`]+$/g, "");
  line = line.replace(/^(query|поиск|search|ответ|output):\s*/i, "");
  return line.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LEN);
}

/** Tokenize query for DB matching (length ≥ 2, deduped). */
export function tokenizeSearchQuery(query: string): string[] {
  const norm = query.toLowerCase().replace(/[^\p{L}\p{N}\s+#@]/gu, " ").replace(/\s+/g, " ").trim();
  if (!norm) return [];
  const words = norm.split(" ").filter((w) => w.length >= 2);
  return [...new Set(words)];
}

const RELATED_SYNONYMS: Record<string, string[]> = {
  reels: ["рилс", "рилсы", "reel", "shorts"],
  рилс: ["reels", "рилсы", "reel", "shorts"],
  рилсы: ["reels", "рилс", "reel"],
  монтаж: ["видеомонтаж", "editing", "edit", "capcut", "premiere"],
  видеомонтаж: ["монтаж", "editing", "reels"],
  instagram: ["инстаграм", "ig", "reels"],
  инстаграм: ["instagram", "reels"],
  youtube: ["ютуб", "shorts"],
  ютуб: ["youtube", "shorts"],
  fitness: ["фитнес", "workout", "gym"],
  фитнес: ["fitness", "workout"],
  viral: ["вирусный", "тренд"],
  вирусный: ["viral", "trending"],
};

/** Local semantic expansion — no extra LLM call. */
export function expandRelatedSearchTerms(terms: string[]): string[] {
  const out = new Set<string>();
  for (const term of terms) {
    out.add(term);
    const syns = RELATED_SYNONYMS[term];
    if (syns) for (const s of syns) out.add(s);
  }
  return [...out];
}

export async function optimizeSearchQuery(userQuery: string): Promise<OptimizedSearchQuery> {
  const trimmed = userQuery.trim();
  if (!trimmed) {
    return { userQuery: "", optimizedQuery: "", terms: [], relatedTerms: [], source: "fallback" };
  }

  let optimizedQuery = trimmed;
  let source: OptimizedSearchQuery["source"] = "fallback";

  try {
    const { text } = await deepseekChatCompletion(
      [
        { role: "system", content: SEARCH_QUERY_OPTIMIZER_SYSTEM_PROMPT },
        { role: "user", content: trimmed },
      ],
      { temperature: 0.15, max_tokens: 80 },
    );
    const sanitized = sanitizeOptimizedQueryOutput(text);
    if (sanitized.length >= 2) {
      optimizedQuery = sanitized;
      source = "deepseek";
    }
  } catch (e) {
    const kind = e instanceof DeepSeekError ? e.kind : "unknown";
    if (kind !== "missing_api_key") {
      await logAdminEvent({
        level: "warn",
        type: "feed_search",
        message: "DeepSeek query optimizer fallback",
        meta: safeMeta({
          error: e instanceof Error ? e.message : String(e),
          kind,
        }),
        consoleOnly: true,
      });
    }
  }

  const combined = `${optimizedQuery} ${trimmed}`;
  const terms = tokenizeSearchQuery(combined);
  const relatedTerms = expandRelatedSearchTerms(terms);

  return { userQuery: trimmed, optimizedQuery, terms, relatedTerms, source };
}
