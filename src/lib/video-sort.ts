import type { Video } from "@prisma/client";
import type { ApiSort } from "@/lib/search-query";

export function sortVideosList(videos: Video[], sort: ApiSort): Video[] {
  const copy = [...videos];
  switch (sort) {
    case "views_desc":
      return copy.sort((a, b) => b.views - a.views);
    case "views_asc":
      return copy.sort((a, b) => a.views - b.views);
    case "date_desc":
      return copy.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    case "date_asc":
      return copy.sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
    case "viral_desc":
      return copy.sort((a, b) => {
        const ds = b.score - a.score;
        if (ds !== 0) return ds;
        return b.rawScore - a.rawScore;
      });
    case "viral_asc":
      return copy.sort((a, b) => {
        const ds = a.score - b.score;
        if (ds !== 0) return ds;
        return a.rawScore - b.rawScore;
      });
    default:
      return copy;
  }
}
