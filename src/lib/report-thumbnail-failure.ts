const THUMB_REPORT_GUARD_MS = 5 * 60_000;
const thumbReportedAt = new Map<string, number>();
const thumbReportInflight = new Set<string>();

/** Fire-and-forget client report when a card thumbnail fails to load. */
export function reportThumbnailLoadFailure(platform: string, externalId: string): void {
  const p = platform.trim();
  const id = externalId.trim();
  if (!p || !id) return;

  const key = `${p}:${id}`;
  const now = Date.now();
  const last = thumbReportedAt.get(key);
  if (last !== undefined && now - last < THUMB_REPORT_GUARD_MS) return;
  if (thumbReportInflight.has(key)) return;

  thumbReportInflight.add(key);
  thumbReportedAt.set(key, now);

  void fetch("/api/videos/thumbnail-health", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform: p, externalId: id, ok: false }),
    keepalive: true,
  })
    .catch(() => {
      /* best effort */
    })
    .finally(() => {
      thumbReportInflight.delete(key);
    });
}
