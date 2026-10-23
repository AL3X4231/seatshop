const DEFAULT_CURRENCY = 'USD';

export function formatMoney(
  amount: number | null | undefined,
  currency = DEFAULT_CURRENCY,
  options: { compact?: boolean; signed?: boolean } = {},
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  const value = Number(amount);
  try {
    if (options.compact && Math.abs(value) >= 1000) {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value);
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
      signDisplay: options.signed ? 'always' : 'auto',
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('fr-FR').format(value);
}

export function formatPercent(value: number, digits = 0): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    maximumFractionDigits: digits,
  }).format(value);
}

export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | Date | null | undefined, withYear = true): string {
  const date = parseDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  }).format(date);
}

export function formatDateLong(value: string | Date | null | undefined): string {
  const date = parseDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = parseDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTime(value: string | Date | null | undefined): string {
  const date = parseDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatWeekday(value: string | Date | null | undefined): string {
  const date = parseDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date);
}

export function formatEventDate(value: string | Date | null | undefined): string {
  const date = parseDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function eventDateParts(value: string | Date | null | undefined): {
  day: string;
  month: string;
  time: string;
  weekday: string;
  year: string;
} {
  const date = parseDate(value);
  if (!date) return { day: '—', month: '', time: '', weekday: '', year: '' };
  return {
    day: new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date).replace('.', ''),
    time: new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date),
    weekday: new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date),
    year: new Intl.DateTimeFormat('fr-FR', { year: 'numeric' }).format(date),
  };
}

export function timeAgo(value: string | Date | null | undefined): string {
  const date = parseDate(value);
  if (!date) return '—';
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });
  if (abs < 60) return formatter.format(seconds, 'second');
  if (abs < 3600) return formatter.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return formatter.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86400 * 30) return formatter.format(Math.round(seconds / 86400), 'day');
  if (abs < 86400 * 365) return formatter.format(Math.round(seconds / (86400 * 30)), 'month');
  return formatter.format(Math.round(seconds / (86400 * 365)), 'year');
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dayKey(value: string | Date): string {
  const date = parseDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export type Period = 'today' | '7d' | '30d' | 'all';

export function periodStart(period: Period): Date | null {
  const now = new Date();
  if (period === 'today') return startOfDay(now);
  if (period === '7d') return startOfDay(addDays(now, -6));
  if (period === '30d') return startOfDay(addDays(now, -29));
  return null;
}

export function periodLabel(period: Period): string {
  return {
    today: "Aujourd'hui",
    '7d': '7 jours',
    '30d': '30 jours',
    all: 'Tout',
  }[period];
}

export function inPeriod(value: string | Date, period: Period): boolean {
  const start = periodStart(period);
  if (!start) return true;
  const date = parseDate(value);
  if (!date) return false;
  return date.getTime() >= start.getTime();
}

export type Tone = 'green' | 'amber' | 'orange' | 'red' | 'gray' | 'blue' | 'violet';

export function saleStatus(status: string): { label: string; tone: Tone } {
  const map: Record<string, { label: string; tone: Tone }> = {
    awaiting_delivery: { label: 'À livrer', tone: 'amber' },
    awaiting_retransfer: { label: 'Re-livraison', tone: 'orange' },
    delivered: { label: 'Livrée', tone: 'green' },
    cancelled: { label: 'Annulée', tone: 'red' },
    canceled: { label: 'Annulée', tone: 'red' },
    pending: { label: 'En attente', tone: 'gray' },
    paid: { label: 'Payée', tone: 'green' },
    refunded: { label: 'Remboursée', tone: 'violet' },
  };
  return map[status] || { label: humanize(status), tone: 'gray' };
}

export function listingStatus(status: string): { label: string; tone: Tone } {
  const map: Record<string, { label: string; tone: Tone }> = {
    published: { label: 'En ligne', tone: 'green' },
    unpublished: { label: 'Hors ligne', tone: 'gray' },
    draft: { label: 'Brouillon', tone: 'gray' },
    paused: { label: 'En pause', tone: 'amber' },
    sold: { label: 'Vendu', tone: 'blue' },
    error: { label: 'Erreur', tone: 'red' },
  };
  return map[status] || { label: humanize(status), tone: 'gray' };
}

export function humanize(value: string): string {
  if (!value) return '—';
  const text = value.replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const MARKETPLACE_COLORS = [
  '#2c6ecb',
  '#7b5cf0',
  '#008060',
  '#b98900',
  '#d72c0d',
  '#0e7490',
  '#9d3fbf',
  '#c2410c',
  '#4338ca',
  '#047857',
];

export function marketplaceColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return MARKETPLACE_COLORS[Math.abs(hash) % MARKETPLACE_COLORS.length];
}

export function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function buyerName(buyer: { first_name: string; last_name: string }): string {
  return `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim();
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count > 1 ? plural : singular;
}

export function safeJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function downloadFile(filename: string, content: string, type = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell === null || cell === undefined ? '' : String(cell);
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(';'),
    )
    .join('\r\n');
}

export function countryName(code: string): string {
  if (!code) return '—';
  try {
    return new Intl.DisplayNames(['fr'], { type: 'region' }).of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}
