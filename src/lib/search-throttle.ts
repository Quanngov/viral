import { prisma } from "@/lib/prisma";

const EXTERNAL_SEARCH_THROTTLE_MINUTES = 15;

/**
 * Проверяет, можно ли делать внешний поиск для данного запроса.
 * Throttle основан на normalized query.
 */
export async function canMakeExternalSearch(query: string): Promise<boolean> {
  try {
    const normalizedQuery = query.toLowerCase().replace(/\s+/g, " ").trim();
    if (!normalizedQuery) return false;

    const now = new Date();
    const throttleMinutesAgo = new Date(now.getTime() - EXTERNAL_SEARCH_THROTTLE_MINUTES * 60 * 1000);

    // Проверяем, был ли недавно внешний поиск для этого запроса
    const recentExternal = await prisma.appRuntimeState.findUnique({
      where: { key: `external_search_${normalizedQuery}` },
    });

    if (recentExternal?.value) {
      const lastSearchAt = new Date(recentExternal.value as string);
      if (lastSearchAt > throttleMinutesAgo) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Failed to check external search throttle:", error);
    return false;
  }
}

/**
 * Отмечает, что для данного запроса был сделан внешний поиск.
 */
export async function markExternalSearchMade(query: string): Promise<void> {
  try {
    const normalizedQuery = query.toLowerCase().replace(/\s+/g, " ").trim();
    if (!normalizedQuery) return;

    const now = new Date();
    
    await prisma.appRuntimeState.upsert({
      where: { key: `external_search_${normalizedQuery}` },
      update: { value: now.toISOString() },
      create: { key: `external_search_${normalizedQuery}`, value: now.toISOString() },
    });
  } catch (error) {
    console.error("Failed to mark external search made:", error);
  }
}