export function formatViewsCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  return String(n);
}

function toValidDate(input: Date | string | number | null | undefined): Date | null {
  if (input == null) return null;
  if (input instanceof Date) {
    const t = input.getTime();
    return Number.isNaN(t) ? null : input;
  }
  const d = new Date(input);
  const t = d.getTime();
  return Number.isNaN(t) ? null : d;
}

/** Короткая подпись возраста для карточки («2 дн назад», «3 нед назад»). */
export function formatAgeCompactRu(input?: Date | string | number | null): string {
  const date = toValidDate(input);
  if (!date) return "—";
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "щас";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн назад`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks} нед назад`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} мес назад`;
  const years = Math.floor(days / 365);
  return `${years} г назад`;
}

export function formatRelativeRu(input?: Date | string | number | null): string {
  const date = toValidDate(input);
  if (!date) return "дата неизвестна";
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "только что";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн. назад`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks} нед. назад`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} мес. назад`;
  const years = Math.floor(days / 365);
  return `${years} г. назад`;
}
