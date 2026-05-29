/** Fire-and-forget client report when a card thumbnail fails to load. */
export function reportThumbnailLoadFailure(platform: string, externalId: string): void {
  const p = platform.trim();
  const id = externalId.trim();
  if (!p || !id) return;

  void fetch("/api/videos/thumbnail-health", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform: p, externalId: id, ok: false }),
    keepalive: true,
  }).catch(() => {
    /* best effort */
  });
}
