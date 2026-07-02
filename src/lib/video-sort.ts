import type { Video } from "@prisma/client";
import type { ApiSort } from "@/lib/search-query";

function effectiveRating(v: Video): number {
  return v.rating > 0 ? v.rating : v.score;
}

export function sortVideosList(videos: Video[], sort: ApiSort): Video[] {
  const copy = [...videos];
  switch (sort) {
    case "views_desc":
      return copy.sort((a, b) => b.views - a.views || effectiveRating(b) - effectiveRating(a));
    case "views_asc":
      return copy.sort((a, b) => a.views - b.views || effectiveRating(a) - effectiveRating(b));
    case "date_desc":
      return copy.sort(
        (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime() || b.views - a.views,
      );
    case "date_asc":
      return copy.sort(
        (a, b) => a.publishedAt.getTime() - b.publishedAt.getTime() || a.views - b.views,
      );
    case "viral_desc":
      return copy.sort((a, b) => {
        const dv = b.viralScore - a.viralScore;
        if (Math.abs(dv) > 0.0001) return dv;
        const dr = effectiveRating(b) - effectiveRating(a);
        if (dr !== 0) return dr;
        return b.views - a.views;
      });
    case "viral_asc":
      return copy.sort((a, b) => {
        const dv = a.viralScore - b.viralScore;
        if (Math.abs(dv) > 0.0001) return dv;
        const dr = effectiveRating(a) - effectiveRating(b);
        if (dr !== 0) return dr;
        return a.views - b.views;
      });
    default:
      return copy;
  }
}
