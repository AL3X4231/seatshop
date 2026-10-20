import type { AppSettings, Mode, SaleAlert } from './types';

const PREFIX = 'seatshop.v1';
const KEYS = {
  apiKey: `${PREFIX}.apiKey`,
  mode: `${PREFIX}.mode`,
  settings: `${PREFIX}.settings`,
  alerts: (mode: Mode) => `${PREFIX}.alerts.${mode}`,
  seen: (mode: Mode) => `${PREFIX}.seen.${mode}`,
  cache: (mode: Mode, kind: string) => `${PREFIX}.cache.${mode}.${kind}`,
  pushEndpoint: `${PREFIX}.pushEndpoint`,
};

export const DEFAULT_SETTINGS: AppSettings = {
  storeName: 'Ma boutique',
  displayName: '',
  soundEnabled: true,
  volume: 0.8,
  pollInterval: 30,
  pushServerUrl: '',
  pushToken: '',
  installBannerDismissed: false,
};

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage may be unavailable (private mode) */
  }
}

function remove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function loadApiKey(): string | null {
  return read(KEYS.apiKey);
}

export function saveApiKey(key: string): void {
  write(KEYS.apiKey, key.trim());
}

export function clearApiKey(): void {
  remove(KEYS.apiKey);
}

export function loadMode(): Mode {
  return read(KEYS.mode) === 'demo' ? 'demo' : 'live';
}

export function saveMode(mode: Mode): void {
  write(KEYS.mode, mode);
}

export function loadSettings(): AppSettings {
  try {
    const parsed = JSON.parse(read(KEYS.settings) || '{}') as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      volume: Math.min(1, Math.max(0, Number(parsed.volume ?? DEFAULT_SETTINGS.volume))),
      pollInterval: [15, 30, 60, 120].includes(Number(parsed.pollInterval))
        ? Number(parsed.pollInterval)
        : DEFAULT_SETTINGS.pollInterval,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  write(KEYS.settings, JSON.stringify(settings));
}

export function loadAlerts(mode: Mode): SaleAlert[] {
  try {
    const parsed = JSON.parse(read(KEYS.alerts(mode)) || '[]');
    return Array.isArray(parsed) ? (parsed as SaleAlert[]) : [];
  } catch {
    return [];
  }
}

export function saveAlerts(mode: Mode, alerts: SaleAlert[]): void {
  write(KEYS.alerts(mode), JSON.stringify(alerts.slice(0, 80)));
}

export function loadSeenSales(mode: Mode): string[] | null {
  const raw = read(KEYS.seen(mode));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}

export function saveSeenSales(mode: Mode, ids: string[]): void {
  write(KEYS.seen(mode), JSON.stringify(ids.slice(0, 600)));
}

export function loadCache<T>(mode: Mode, kind: string): { savedAt: string; data: T } | null {
  try {
    const parsed = JSON.parse(read(KEYS.cache(mode, kind)) || 'null');
    if (parsed && typeof parsed === 'object' && 'data' in parsed) {
      return parsed as { savedAt: string; data: T };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCache<T>(mode: Mode, kind: string, data: T): void {
  try {
    write(KEYS.cache(mode, kind), JSON.stringify({ savedAt: new Date().toISOString(), data }));
  } catch {
    /* quota exceeded: cache is best effort */
  }
}

export function clearCache(mode?: Mode): void {
  const modes: Mode[] = mode ? [mode] : ['live', 'demo'];
  modes.forEach((item) => {
    ['me', 'sales', 'listings', 'events'].forEach((kind) => remove(KEYS.cache(item, kind)));
  });
}

export function clearModeData(mode: Mode): void {
  remove(KEYS.alerts(mode));
  remove(KEYS.seen(mode));
  clearCache(mode);
}

export function clearAllData(): void {
  remove(KEYS.apiKey);
  remove(KEYS.mode);
  remove(KEYS.settings);
  remove(KEYS.pushEndpoint);
  clearModeData('live');
  clearModeData('demo');
}

export function loadPushEndpoint(): string | null {
  return read(KEYS.pushEndpoint);
}

export function savePushEndpoint(endpoint: string | null): void {
  if (endpoint) write(KEYS.pushEndpoint, endpoint);
  else remove(KEYS.pushEndpoint);
}
