import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError, errorText, fetchAllPages } from '../lib/api';
import {
  getDemoData,
  resetDemoData,
  simulateDemoSale,
  demoEventDetail,
} from '../lib/demo';
import {
  formatMoney,
  pluralize,
  startOfDay,
} from '../lib/format';
import {
  playSaleSound,
  setAppBadgeCount,
  showSystemNotification,
  vibrate,
} from '../lib/notifications';
import {
  loadAlerts,
  loadCache,
  loadSeenSales,
  saveAlerts,
  saveCache,
  saveSeenSales,
} from '../lib/storage';
import type {
  EventDetail,
  EventSummary,
  Listing,
  Me,
  Mode,
  Sale,
  SaleAlert,
  SyncState,
} from '../lib/types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

type DemoData = ReturnType<typeof getDemoData>;

type DataContextValue = {
  me: Me | null;
  sales: Sale[];
  listings: Listing[];
  events: EventSummary[];
  sync: SyncState;
  online: boolean;
  hasMoreSales: boolean;
  hasMoreListings: boolean;
  alerts: SaleAlert[];
  unreadCount: number;
  refreshAll: () => Promise<void>;
  refreshSales: () => Promise<void>;
  markAlertsRead: () => void;
  markAlertRead: (id: string) => void;
  clearAlerts: () => void;
  simulateSale: () => Promise<Sale | null>;
  resetDemo: () => void;
  getSale: (id: string) => Promise<Sale | null>;
  getListing: (id: string) => Promise<Listing | null>;
  getEvent: (id: string) => Promise<EventDetail | null>;
};

const DataContext = createContext<DataContextValue | null>(null);

function sortSales(items: Sale[]): Sale[] {
  return [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

function todayIso(): string {
  return startOfDay(new Date()).toISOString();
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { mode, apiKey, settings, signOut } = useAuth();
  const { toast } = useToast();

  const [me, setMe] = useState<Me | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [hasMoreSales, setHasMoreSales] = useState(false);
  const [hasMoreListings, setHasMoreListings] = useState(false);
  const [alerts, setAlerts] = useState<SaleAlert[]>(() => loadAlerts(mode));
  const [online, setOnline] = useState(() => navigator.onLine);
  const [sync, setSync] = useState<SyncState>({
    loading: true,
    refreshing: false,
    error: null,
    lastSync: null,
    fromCache: false,
  });

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const modeRef = useRef<Mode>(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const demoDataRef = useRef<DemoData | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const seenInitializedRef = useRef(false);
  const alertsRef = useRef<SaleAlert[]>(alerts);
  const alertsModeRef = useRef<Mode>(mode);
  const salesRef = useRef<Sale[]>([]);
  const lastSyncRef = useRef<number>(0);
  const refreshingRef = useRef(false);
  const salesRefreshingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Au changement de mode, le chargement ci-dessous remplace d'abord les
    // alertes. On évite d'écrire les alertes de l'ancien mode dans le nouveau.
    if (alertsModeRef.current !== mode) return;
    alertsRef.current = alerts;
    saveAlerts(mode, alerts);
    const unread = alerts.filter((alert) => !alert.read).length;
    setAppBadgeCount(unread);
  }, [alerts, mode]);

  useEffect(() => {
    salesRef.current = sales;
  }, [sales]);

  const announceSales = useCallback(
    (newSales: Sale[]) => {
      if (!newSales.length) return;
      const now = new Date().toISOString();
      const created: SaleAlert[] = newSales.slice(0, 12).map((sale) => ({
        id: sale.id,
        saleId: sale.id,
        title: 'Nouvelle vente',
        body: `${sale.quantity} ${pluralize(sale.quantity, 'billet')} · ${sale.event.name} · ${
          sale.marketplace
        } · ${formatMoney(sale.payout.total_amount, sale.payout.currency)}`,
        amount: sale.payout.total_amount,
        currency: sale.payout.currency,
        createdAt: now,
        read: false,
        demo: modeRef.current === 'demo',
      }));

      setAlerts((current) => {
        const existing = new Set(current.map((alert) => alert.saleId));
        const fresh = created.filter((alert) => !existing.has(alert.saleId));
        if (!fresh.length) return current;
        const merged = [...fresh, ...current].slice(0, 80);
        alertsRef.current = merged;
        saveAlerts(modeRef.current, merged);
        window.setTimeout(() => setAppBadgeCount(merged.filter((alert) => !alert.read).length), 50);
        return merged;
      });

      const total = newSales.reduce((sum, sale) => sum + sale.payout.total_amount, 0);
      const currency = newSales[0]?.payout.currency || 'USD';
      const latest = newSales[0];
      const isSingle = newSales.length === 1;
      const title = isSingle
        ? `Cha-ching ! ${formatMoney(latest.payout.total_amount, latest.payout.currency)}`
        : `${newSales.length} nouvelles ventes`;
      const message = isSingle
        ? `${latest.quantity} ${pluralize(latest.quantity, 'billet')} · ${latest.event.name} · ${latest.marketplace}`
        : `${formatMoney(total, currency)} · Dernière vente : ${latest.event.name}`;

      if (settingsRef.current.soundEnabled) {
        void playSaleSound(settingsRef.current.volume);
      }
      vibrate();

      toast({
        title,
        message,
        tone: 'sale',
        duration: 12000,
        action: {
          label: isSingle ? 'Voir la vente' : 'Voir les ventes',
          to: isSingle ? `/sales/${latest.id}` : '/sales',
        },
      });

      if (document.hidden) {
        void showSystemNotification({
          title: isSingle
            ? `Nouvelle vente · ${formatMoney(latest.payout.total_amount, latest.payout.currency)}`
            : `${newSales.length} nouvelles ventes · ${formatMoney(total, currency)}`,
          body: isSingle
            ? `${latest.quantity} ${pluralize(latest.quantity, 'billet')} · ${latest.event.name} — ${latest.marketplace}`
            : `Dernière vente : ${latest.event.name} — ${latest.marketplace}`,
          saleId: isSingle ? latest.id : undefined,
          tag: isSingle ? `sale-${latest.id}` : 'seatshop-sales',
          url: `${window.location.origin}${import.meta.env.BASE_URL}#/sales${
            isSingle ? `/${latest.id}` : ''
          }`,
        });
      }
    },
    [toast],
  );

  const commitSales = useCallback(
    (nextSales: Sale[], announce: boolean) => {
      const sorted = sortSales(nextSales);
      salesRef.current = sorted;
      setSales(sorted);
      saveCache(modeRef.current === 'demo' ? 'demo' : 'live', 'sales', sorted);

      if (!seenInitializedRef.current) {
        sorted.forEach((sale) => seenRef.current.add(sale.id));
        seenInitializedRef.current = true;
        saveSeenSales(modeRef.current, Array.from(seenRef.current));
        return;
      }

      const fresh = sorted.filter((sale) => !seenRef.current.has(sale.id));
      sorted.forEach((sale) => seenRef.current.add(sale.id));
      if (fresh.length) {
        saveSeenSales(modeRef.current, Array.from(seenRef.current));
        if (announce) announceSales(fresh);
      }
    },
    [announceSales],
  );

  const refreshAll = useCallback(async () => {
    if (mode !== 'live' || !apiKey) return;
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setSync((current) => ({ ...current, refreshing: true, error: null }));

    try {
      const [nextMe, salesResult, listingsResult, eventsResult] = await Promise.all([
        api.me(apiKey),
        fetchAllPages(
          (cursor) => api.sales(apiKey, { limit: 100, cursor }),
          8,
        ),
        fetchAllPages(
          (cursor) => api.listings(apiKey, { limit: 100, cursor }),
          10,
        ),
        api.events(apiKey, { limit: 30, date_from: todayIso() }),
      ]);

      if (!mountedRef.current) return;
      setMe(nextMe);
      saveCache('live', 'me', nextMe);

      commitSales(salesResult.data, true);
      const sortedListings = [...listingsResult.data].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setListings(sortedListings);
      setHasMoreSales(salesResult.hasMore);
      setHasMoreListings(listingsResult.hasMore);
      saveCache('live', 'listings', sortedListings);
      const nextEvents = eventsResult.data || [];
      setEvents(nextEvents);
      saveCache('live', 'events', nextEvents);

      const now = new Date().toISOString();
      lastSyncRef.current = Date.now();
      setSync({
        loading: false,
        refreshing: false,
        error: null,
        lastSync: now,
        fromCache: false,
      });
    } catch (error) {
      if (!mountedRef.current) return;
      if (error instanceof ApiError && error.status === 401) {
        signOut();
        toast({
          title: 'Clé API expirée',
          message: 'Reconnectez-vous avec une clé Seatiks valide.',
          tone: 'error',
        });
        return;
      }
      setSync((current) => ({
        ...current,
        loading: false,
        refreshing: false,
        error: errorText(error),
      }));
    } finally {
      refreshingRef.current = false;
    }
  }, [mode, apiKey, commitSales, signOut, toast]);

  const refreshSales = useCallback(async () => {
    if (mode !== 'live' || !apiKey) return;
    if (salesRefreshingRef.current) return;
    salesRefreshingRef.current = true;
    try {
      // Le polling ne recharge que la page la plus récente : les ventes déjà
      // connues sont fusionnées localement pour éviter des appels inutiles.
      const result = await api.sales(apiKey, { limit: 100 });
      if (!mountedRef.current) return;
      const merged = new Map(salesRef.current.map((sale) => [sale.id, sale]));
      result.data.forEach((sale) => merged.set(sale.id, sale));
      commitSales(Array.from(merged.values()), true);
      setHasMoreSales(Boolean(result.has_more));
      const now = new Date().toISOString();
      lastSyncRef.current = Date.now();
      setSync((current) => ({
        ...current,
        loading: false,
        error: null,
        lastSync: now,
        fromCache: false,
      }));
    } catch (error) {
      if (!mountedRef.current) return;
      if (error instanceof ApiError && error.status === 401) {
        signOut();
        return;
      }
      setSync((current) => ({ ...current, error: errorText(error) }));
    } finally {
      salesRefreshingRef.current = false;
    }
  }, [mode, apiKey, commitSales, signOut]);

  const refreshCatalog = useCallback(async () => {
    if (mode !== 'live' || !apiKey) return;
    try {
      const [listingsResult, eventsResult] = await Promise.all([
        fetchAllPages((cursor) => api.listings(apiKey, { limit: 100, cursor }), 10),
        api.events(apiKey, { limit: 30, date_from: todayIso() }),
      ]);
      if (!mountedRef.current) return;
      const sortedListings = [...listingsResult.data].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setListings(sortedListings);
      setHasMoreListings(listingsResult.hasMore);
      saveCache('live', 'listings', sortedListings);
      setEvents(eventsResult.data || []);
      saveCache('live', 'events', eventsResult.data || []);
    } catch {
      /* catalog refresh is silent */
    }
  }, [mode, apiKey]);

  // Load / reset everything when the mode or key changes.
  useEffect(() => {
    let cancelled = false;
    setMe(null);
    salesRef.current = [];
    setSales([]);
    setListings([]);
    setEvents([]);
    setHasMoreSales(false);
    setHasMoreListings(false);
    setSync({ loading: true, refreshing: false, error: null, lastSync: null, fromCache: false });
    lastSyncRef.current = 0;

    const storedSeen = loadSeenSales(mode);
    seenRef.current = new Set(storedSeen || []);
    seenInitializedRef.current = storedSeen !== null;
    const storedAlerts = loadAlerts(mode);
    alertsModeRef.current = mode;
    setAlerts(storedAlerts);
    alertsRef.current = storedAlerts;

    if (mode === 'demo') {
      const data = getDemoData();
      demoDataRef.current = data;
      setMe(data.me);
      setSales(sortSales(data.sales));
      setListings(data.listings);
      setEvents(data.events);
      if (!seenInitializedRef.current) {
        data.sales.forEach((sale) => seenRef.current.add(sale.id));
        seenInitializedRef.current = true;
        saveSeenSales('demo', Array.from(seenRef.current));
      }
      setSync({
        loading: false,
        refreshing: false,
        error: null,
        lastSync: new Date().toISOString(),
        fromCache: false,
      });
      return () => {
        cancelled = true;
      };
    }

    if (!apiKey) {
      setSync({ loading: false, refreshing: false, error: null, lastSync: null, fromCache: false });
      return () => {
        cancelled = true;
      };
    }

    const cachedMe = loadCache<Me>('live', 'me');
    const cachedSales = loadCache<Sale[]>('live', 'sales');
    const cachedListings = loadCache<Listing[]>('live', 'listings');
    const cachedEvents = loadCache<EventSummary[]>('live', 'events');

    if (!cancelled) {
      if (cachedMe) setMe(cachedMe.data);
      if (cachedSales) {
        setSales(sortSales(cachedSales.data));
        lastSyncRef.current = new Date(cachedSales.savedAt).getTime();
      }
      if (cachedListings) setListings(cachedListings.data);
      if (cachedEvents) setEvents(cachedEvents.data);
      if (cachedSales || cachedMe) {
        setSync({
          loading: false,
          refreshing: true,
          error: null,
          lastSync: cachedSales?.savedAt || null,
          fromCache: true,
        });
      }
    }

    void refreshAll();

    return () => {
      cancelled = true;
    };
    // refreshAll is intentionally not in the dependency list: it changes with the
    // same mode/key and would restart the loader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, apiKey]);

  // Poll while the app is visible. Background notifications are handled by the
  // optional push worker.
  useEffect(() => {
    if (mode !== 'live' || !apiKey) return;
    const intervalMs = Math.max(15, settings.pollInterval) * 1000;

    const tick = () => {
      if (document.hidden) return;
      const stale = Date.now() - lastSyncRef.current > intervalMs;
      if (stale) void refreshSales();
    };

    const timer = window.setInterval(tick, intervalMs);

    const onVisible = () => {
      if (document.hidden) return;
      const staleFor = Date.now() - lastSyncRef.current;
      if (staleFor > 5 * 60 * 1000) {
        void refreshAll();
      } else if (staleFor > intervalMs) {
        void refreshSales();
      }
    };
    const onOnline = () => {
      setOnline(true);
      void refreshAll();
    };
    const onOffline = () => setOnline(false);
    const onFocus = () => {
      if (Date.now() - lastSyncRef.current > Math.max(intervalMs, 60000)) {
        void refreshSales();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const catalogTimer = window.setInterval(() => {
      if (!document.hidden) void refreshCatalog();
    }, 5 * 60 * 1000);

    return () => {
      window.clearInterval(timer);
      window.clearInterval(catalogTimer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [mode, apiKey, settings.pollInterval, refreshSales, refreshCatalog, refreshAll]);

  const markAlertsRead = useCallback(() => {
    setAlerts((current) => {
      const next = current.map((alert) => ({ ...alert, read: true }));
      saveAlerts(mode, next);
      return next;
    });
    setAppBadgeCount(0);
  }, [mode]);

  const markAlertRead = useCallback(
    (id: string) => {
      setAlerts((current) => {
        const next = current.map((alert) => (alert.id === id ? { ...alert, read: true } : alert));
        saveAlerts(mode, next);
        return next;
      });
    },
    [mode],
  );

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    saveAlerts(mode, []);
    setAppBadgeCount(0);
  }, [mode]);

  const simulateSale = useCallback(async (): Promise<Sale | null> => {
    if (mode !== 'demo' || !demoDataRef.current) return null;
    const { sale, data } = simulateDemoSale(demoDataRef.current);
    demoDataRef.current = data;
    setSales(sortSales(data.sales));
    announceSales([sale]);
    return sale;
  }, [mode, announceSales]);

  const resetDemo = useCallback(() => {
    const data = resetDemoData();
    demoDataRef.current = data;
    setMe(data.me);
    setSales(sortSales(data.sales));
    setListings(data.listings);
    setEvents(data.events);
    setAlerts([]);
    saveAlerts('demo', []);
    seenRef.current = new Set(data.sales.map((sale) => sale.id));
    seenInitializedRef.current = true;
    saveSeenSales('demo', Array.from(seenRef.current));
    setSync({
      loading: false,
      refreshing: false,
      error: null,
      lastSync: new Date().toISOString(),
      fromCache: false,
    });
    toast({ title: 'Démo réinitialisée', tone: 'success' });
  }, [toast]);

  const getSale = useCallback(
    async (id: string): Promise<Sale | null> => {
      const existing = sales.find((sale) => sale.id === id);
      if (existing) return existing;
      if (mode === 'demo') {
        return demoDataRef.current?.sales.find((sale) => sale.id === id) || null;
      }
      if (!apiKey) return null;
      try {
        return await api.sale(apiKey, id);
      } catch {
        return null;
      }
    },
    [sales, mode, apiKey],
  );

  const getListing = useCallback(
    async (id: string): Promise<Listing | null> => {
      const existing = listings.find((listing) => listing.id === id);
      if (existing) return existing;
      if (mode === 'demo') {
        return demoDataRef.current?.listings.find((listing) => listing.id === id) || null;
      }
      if (!apiKey) return null;
      try {
        return await api.listing(apiKey, id);
      } catch {
        return null;
      }
    },
    [listings, mode, apiKey],
  );

  const getEvent = useCallback(
    async (id: string): Promise<EventDetail | null> => {
      const existing = events.find((event) => event.id === id);
      if (mode === 'demo') {
        return existing ? demoEventDetail(existing) : null;
      }
      if (!apiKey) return existing ? { ...existing } : null;
      try {
        return await api.event(apiKey, id);
      } catch {
        return existing ? { ...existing } : null;
      }
    },
    [events, mode, apiKey],
  );

  const unreadCount = alerts.filter((alert) => !alert.read).length;

  const value = useMemo<DataContextValue>(
    () => ({
      me,
      sales,
      listings,
      events,
      sync,
      online,
      hasMoreSales,
      hasMoreListings,
      alerts,
      unreadCount,
      refreshAll,
      refreshSales,
      markAlertsRead,
      markAlertRead,
      clearAlerts,
      simulateSale,
      resetDemo,
      getSale,
      getListing,
      getEvent,
    }),
    [
      me,
      sales,
      listings,
      events,
      sync,
      online,
      hasMoreSales,
      hasMoreListings,
      alerts,
      unreadCount,
      refreshAll,
      refreshSales,
      markAlertsRead,
      markAlertRead,
      clearAlerts,
      simulateSale,
      resetDemo,
      getSale,
      getListing,
      getEvent,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
