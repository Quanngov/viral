import { prisma } from "@/lib/prisma";
import { detectTrendCandidates } from "./detect-trend-candidates";

const THROTTLE_MINUTES = 5;

/**
 * Запускает detectTrendCandidates только если прошло больше 5 минут с последнего запуска
 * из того же источника. Предотвращает слишком частые сканы базы.
 */
export async function throttledDetectTrends(source = "auto_trigger"): Promise<void> {
  try {
    const key = `trends_last_${source}_at`;
    const now = new Date();
    
    const lastRunState = await prisma.appRuntimeState.findUnique({
      where: { key },
    });

    const lastRunAt = lastRunState?.value
      ? new Date(lastRunState.value as string)
      : new Date(0);

    const minutesAgo = (now.getTime() - lastRunAt.getTime()) / (1000 * 60);

    if (minutesAgo >= THROTTLE_MINUTES) {
      await detectTrendCandidates(source);
      
      // Обновляем время последнего запуска
      await prisma.appRuntimeState.upsert({
        where: { key },
        update: { value: now.toISOString() },
        create: { key, value: now.toISOString() },
      });
    }
  } catch (error) {
    console.error("Throttled detect trends error:", error);
  }
}