import { prisma } from "@/lib/prisma";

/**
 * Возвращает топ-3/5 популярных поисковых запросов за последние 14 дней.
 * При равном количестве поисков выше ставятся более свежие.
 */
export async function getPopularSearchTopics(limit = 5): Promise<string[]> {
  try {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const results = await prisma.searchQueryLog.groupBy({
      by: ["normalizedQuery"],
      where: {
        createdAt: {
          gte: fourteenDaysAgo,
        },
        normalizedQuery: {
          not: "",
        },
      },
      _count: {
        id: true,
      },
      _max: {
        createdAt: true,
      },
      orderBy: [
        {
          _count: {
            id: "desc",
          },
        },
        {
          _max: {
            createdAt: "desc",
          },
        },
      ],
      take: limit,
    });

    return results.map((r) => r.normalizedQuery);
  } catch (error) {
    console.error("Failed to get popular search topics:", error);
    return [];
  }
}