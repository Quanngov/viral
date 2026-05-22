import type { TrendsPayload } from "@/lib/dashboard-fetch";

export type LiveTrendVideo = {
  id: string;
  title: string;
  thumbnailUrl: string;
  views: string;
  platform: string;
  isNew?: boolean;
};

type TrendItem = {
  id: string;
  video: {
    id: string;
    title: string;
    thumbnailUrl?: string;
    views: number | string;
    platform: string;
  };
};

export function mapTrendsPayload(data: TrendsPayload): LiveTrendVideo[] {
  const trendItems = data.trends as TrendItem[];
  const newItems = data.newItems as { id: string }[];

  return trendItems.map((item, index) => {
    const isNew = newItems.some((n) => n.id === item.id);
    const viewsRaw = item.video?.views;
    const viewsNum =
      typeof viewsRaw === "number"
        ? viewsRaw
        : typeof viewsRaw === "string"
          ? Number(String(viewsRaw).replace(/\s/g, "")) || 0
          : 0;
    return {
      id: item.video.id,
      title: item.video.title,
      thumbnailUrl: item.video.thumbnailUrl || "",
      views: typeof viewsRaw === "string" ? viewsRaw : viewsNum.toLocaleString("ru-RU"),
      platform: item.video.platform,
      isNew: isNew && index < 3,
    };
  });
}
