/** Disabled on hot path — client errors were over-marking valid CDN thumbs. */
export function reportThumbnailFailure(_platform: string, _externalId: string): void {
  /* no-op */
}
