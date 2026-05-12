/**
 * Универсальный рейтинг 0–99: просмотры, свежесть, скорость, вовлечённость,
 * опционально followers и retention (нейтральные коэффициенты, если нет данных).
 */
export type UniversalRatingInput = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  publishedAt: Date;
  now?: Date;
  followerCount?: number | null;
  retentionRate?: number | null; // 0..1 completion if ever available
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function computeUniversalVideoRating(input: UniversalRatingInput): number {
  const now = input.now ?? new Date();
  const views = Math.max(0, input.views);
  const likes = Math.max(0, input.likes);
  const comments = Math.max(0, input.comments);
  const shares = Math.max(0, input.shares);

  const ageMs = Math.max(0, now.getTime() - input.publishedAt.getTime());
  const ageDays = Math.max(ageMs / (24 * 3600 * 1000), 1 / 24);

  const baseViewsScore = Math.log10(views + 1) * 10;

  const days = ageDays;
  const freshnessBoost = days <= 7 ? 18 * (1 - days / 7) * 0.5 : 0;
  const monthRelevanceBoost = days <= 30 ? 10 * (1 - days / 30) : 0;

  const vSafe = Math.max(views, 1);
  const engagementScore =
    (likes / vSafe + (comments / vSafe) * 3 + (shares / vSafe) * 4) * 22;
  const engagementCapped = Math.min(engagementScore, 28);

  const velocityScore = Math.log10(views / ageDays + 1) * 9;

  const followers = input.followerCount != null && input.followerCount > 0 ? input.followerCount : null;
  const vf = followers ? views / followers : null;
  const smallCreatorBoost =
    vf != null && vf > 0.05 ? Math.min(12, Math.log10(vf * 100 + 1) * 4) : vf == null ? 3 : 0;

  const retentionNeutral = 5;
  const retention =
    input.retentionRate != null && Number.isFinite(input.retentionRate)
      ? clamp01(input.retentionRate) * 12
      : retentionNeutral;

  const raw =
    baseViewsScore +
    freshnessBoost +
    monthRelevanceBoost +
    engagementCapped +
    velocityScore +
    smallCreatorBoost +
    retention;

  const scaled = raw * 0.78;
  return Math.round(Math.max(0, Math.min(99, scaled)));
}
