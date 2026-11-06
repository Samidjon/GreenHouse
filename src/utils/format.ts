const LOCALE = 'ru-RU';

/** Russian plural forms: plural(n, 'монета', 'монеты', 'монет'). */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.floor(n));
  const lastTwo = abs % 100;
  const last = abs % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export const formatNumber = (n: number): string => Math.floor(n).toLocaleString(LOCALE);

export const coinsText = (n: number): string => `${formatNumber(n)} ${plural(n, 'монета', 'монеты', 'монет')}`;
export const gemsText = (n: number): string => `${formatNumber(n)} ${plural(n, 'самоцвет', 'самоцвета', 'самоцветов')}`;

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  if (s < 60) return `${s} с`;
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const rest = s % 60;
    return rest ? `${m} мин ${rest} с` : `${m} мин`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

/** Reads after «Вас не было…». */
export function formatAway(totalSec: number): string {
  if (totalSec < 3600) {
    const m = Math.max(1, Math.round(totalSec / 60));
    return `${m} ${plural(m, 'минуту', 'минуты', 'минут')}`;
  }
  if (totalSec < 86400) {
    const h = Math.round(totalSec / 3600);
    return h === 1 ? 'час' : `${h} ${plural(h, 'час', 'часа', 'часов')}`;
  }
  const d = Math.round(totalSec / 86400);
  return d === 1 ? 'сутки' : `${d} ${plural(d, 'день', 'дня', 'дней')}`;
}

export const formatDate = (ts: number): string =>
  new Date(ts).toLocaleDateString(LOCALE, { year: 'numeric', month: 'short', day: 'numeric' });

export const formatDateTime = (ts: number): string =>
  new Date(ts).toLocaleString(LOCALE, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
