/** Убирает таймкоды и номера реплик из SRT/VTT, возвращает связный текст. */
export function srtOrVttToPlainText(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (/^\d+$/.test(t)) continue;
    if (/^\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s+-->\s+/.test(t)) continue;
    if (t === "WEBVTT" || t.startsWith("NOTE ") || t.startsWith("STYLE") || t.startsWith("REGION ") || t.startsWith("X-TIMESTAMP-MAP")) continue;
    out.push(t);
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}
