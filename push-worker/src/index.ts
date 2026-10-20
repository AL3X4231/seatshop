/**
 * SeatShop Push Worker
 * --------------------
 * Vérifie les nouvelles ventes Seatiks toutes les minutes et envoie une
 * notification Web Push aux appareils abonnés. Les clés VAPID sont générées
 * automatiquement au premier appel et stockées dans Cloudflare KV.
 *
 * Secrets requis :
 *   SEATIKS_API_KEY   Clé API Seatiks en lecture seule
 *   SUBSCRIBE_TOKEN   (optionnel) Jeton partagé avec la PWA
 *
 * Variables :
 *   APP_URL           URL publique de la PWA (avec slash final)
 *   VAPID_SUBJECT     mailto:vous@exemple.com (recommandé)
 */

import {
  buildPushPayload,
  type PushSubscription as WebPushSubscription,
} from '@block65/webcrypto-web-push';

interface Env {
  SEATSHOP_KV: KVNamespace;
  SEATIKS_API_KEY: string;
  SUBSCRIBE_TOKEN?: string;
  APP_URL: string;
  VAPID_SUBJECT?: string;
}

type StoredSubscription = WebPushSubscription & {
  device?: string;
  createdAt: string;
  updatedAt: string;
};

type VapidRecord = {
  publicKey: string;
  privateKey: string;
  subject: string;
  createdAt: string;
};

type WorkerState = {
  initialized: boolean;
  lastCheck: string | null;
  lastSaleAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  seenSales: string[];
};

type ApiSale = {
  id: string;
  short_id?: string;
  marketplace?: string;
  quantity?: number;
  status?: string;
  created_at?: string;
  payout?: {
    total_amount?: number;
    currency?: string;
  };
  event?: {
    name?: string;
    start_date?: string;
  };
};

type SalesPage = {
  data?: ApiSale[];
  has_more?: boolean;
  next_cursor?: string | null;
};

type NotificationPayload = {
  title: string;
  body: string;
  icon: string;
  badge: string;
  tag: string;
  timestamp: number;
  requireInteraction: boolean;
  data: {
    url: string;
    saleId?: string;
  };
};

const API_ROOT = 'https://api.seatiks.com';
const KV = {
  vapid: 'v1:vapid',
  state: 'v1:state',
  subscriptionPrefix: 'v1:sub:',
};

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-SeatShop-Token',
  'Access-Control-Max-Age': '86400',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function errorResponse(message: string, status = 400): Response {
  return json({ ok: false, error: message }, status);
}

function normalizeAppUrl(value: string | undefined): string {
  const fallback = 'https://al3x4231.github.io/seatshop/';
  const raw = (value || fallback).trim();
  try {
    const url = new URL(raw.endsWith('/') ? raw : `${raw}/`);
    return url.href;
  } catch {
    return fallback;
  }
}

function appUrl(env: Env): string {
  return normalizeAppUrl(env.APP_URL);
}

function assetUrl(env: Env, path: string): string {
  return new URL(path, appUrl(env)).href;
}

function saleUrl(env: Env, id?: string): string {
  const suffix = id ? `#/sales/${encodeURIComponent(id)}` : '#/sales';
  return new URL(suffix, appUrl(env)).href;
}

function maskError(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 280);
  return String(error).slice(0, 280);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function defaultState(): WorkerState {
  return {
    initialized: false,
    lastCheck: null,
    lastSaleAt: null,
    lastSuccessAt: null,
    lastError: null,
    seenSales: [],
  };
}

async function loadState(env: Env): Promise<WorkerState> {
  try {
    const stored = await env.SEATSHOP_KV.get(KV.state, 'json');
    if (!stored || typeof stored !== 'object') return defaultState();
    const value = stored as Partial<WorkerState>;
    return {
      initialized: Boolean(value.initialized),
      lastCheck: typeof value.lastCheck === 'string' ? value.lastCheck : null,
      lastSaleAt: typeof value.lastSaleAt === 'string' ? value.lastSaleAt : null,
      lastSuccessAt: typeof value.lastSuccessAt === 'string' ? value.lastSuccessAt : null,
      lastError: typeof value.lastError === 'string' ? value.lastError : null,
      seenSales: Array.isArray(value.seenSales)
        ? value.seenSales.filter((id): id is string => typeof id === 'string').slice(0, 600)
        : [],
    };
  } catch {
    return defaultState();
  }
}

async function saveState(env: Env, state: WorkerState): Promise<void> {
  await env.SEATSHOP_KV.put(KV.state, JSON.stringify(state));
}

/**
 * Génère et persiste une paire VAPID P-256 au premier démarrage.
 * La clé publique est le point brut (65 octets) encodé en base64url, le format
 * attendu par PushManager.subscribe().
 */
async function ensureVapid(env: Env): Promise<VapidRecord> {
  const subject = (env.VAPID_SUBJECT || 'mailto:hello@seatshop.app').trim();
  try {
    const stored = (await env.SEATSHOP_KV.get(KV.vapid, 'json')) as VapidRecord | null;
    if (stored?.publicKey && stored?.privateKey) {
      if (stored.subject !== subject) {
        const updated = { ...stored, subject };
        await env.SEATSHOP_KV.put(KV.vapid, JSON.stringify(updated));
        return updated;
      }
      return stored;
    }
  } catch {
    /* regenerate below */
  }

  const pair = (await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const rawPublicKey = new Uint8Array(
    (await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer,
  );
  const privateJwk = (await crypto.subtle.exportKey('jwk', pair.privateKey)) as JsonWebKey;
  if (!privateJwk.d) throw new Error('Impossible de générer la clé VAPID privée.');

  const record: VapidRecord = {
    publicKey: bytesToBase64Url(rawPublicKey),
    privateKey: privateJwk.d,
    subject,
    createdAt: new Date().toISOString(),
  };
  await env.SEATSHOP_KV.put(KV.vapid, JSON.stringify(record));
  return record;
}

async function listSubscriptions(env: Env): Promise<StoredSubscription[]> {
  const subscriptions: StoredSubscription[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.SEATSHOP_KV.list({
      prefix: KV.subscriptionPrefix,
      limit: 1000,
      cursor,
    });
    const values = await Promise.all(
      page.keys.map((key) => env.SEATSHOP_KV.get<StoredSubscription>(key.name, 'json')),
    );
    for (const value of values) {
      if (value?.endpoint && value.keys?.p256dh && value.keys?.auth) {
        subscriptions.push(value);
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return subscriptions;
}

async function countSubscriptions(env: Env): Promise<number> {
  let count = 0;
  let cursor: string | undefined;
  do {
    const page = await env.SEATSHOP_KV.list({
      prefix: KV.subscriptionPrefix,
      limit: 1000,
      cursor,
    });
    count += page.keys.length;
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return count;
}

async function deleteSubscription(env: Env, endpoint: string): Promise<void> {
  const key = KV.subscriptionPrefix + (await sha256(endpoint));
  await env.SEATSHOP_KV.delete(key);
}

function normalizeSubscription(input: unknown): StoredSubscription | null {
  if (!input || typeof input !== 'object') return null;
  const candidate = input as {
    endpoint?: unknown;
    expirationTime?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
    device?: unknown;
  };
  if (typeof candidate.endpoint !== 'string') return null;
  try {
    const endpoint = new URL(candidate.endpoint);
    if (endpoint.protocol !== 'https:') return null;
  } catch {
    return null;
  }
  if (
    typeof candidate.keys?.p256dh !== 'string' ||
    typeof candidate.keys?.auth !== 'string'
  ) {
    return null;
  }
  if (candidate.keys.p256dh.length < 20 || candidate.keys.auth.length < 8) return null;

  const now = new Date().toISOString();
  return {
    endpoint: candidate.endpoint,
    expirationTime:
      typeof candidate.expirationTime === 'number' ? candidate.expirationTime : null,
    keys: {
      p256dh: candidate.keys.p256dh,
      auth: candidate.keys.auth,
    },
    device: typeof candidate.device === 'string' ? candidate.device.slice(0, 240) : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

function authorized(request: Request, env: Env): boolean {
  if (!env.SUBSCRIBE_TOKEN) return true;
  return request.headers.get('X-SeatShop-Token') === env.SUBSCRIBE_TOKEN;
}

function formatMoney(amount: number | undefined, currency: string | undefined): string {
  const value = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  const code = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${code}`;
  }
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function notificationForSale(env: Env, sale: ApiSale): NotificationPayload {
  const quantity = Number(sale.quantity) || 1;
  const amount = sale.payout?.total_amount;
  const currency = sale.payout?.currency;
  const marketplace = sale.marketplace || 'Marketplace';
  const eventName = sale.event?.name || 'Événement Seatiks';
  return {
    title: `Nouvelle vente · ${formatMoney(amount, currency)}`,
    body: `${quantity} ${quantity > 1 ? 'billets' : 'billet'} · ${truncate(
      eventName,
      90,
    )} — ${marketplace}`,
    icon: assetUrl(env, 'icons/icon-192.png'),
    badge: assetUrl(env, 'icons/icon-96.png'),
    tag: `sale-${sale.id}`,
    timestamp: sale.created_at ? Date.parse(sale.created_at) || Date.now() : Date.now(),
    requireInteraction: false,
    data: {
      url: saleUrl(env, sale.id),
      saleId: sale.id,
    },
  };
}

function summaryNotification(env: Env, sales: ApiSale[]): NotificationPayload {
  const latest = sales[sales.length - 1];
  const latestEvent = latest?.event?.name || 'Seatiks';
  return {
    title: `${sales.length} nouvelles ventes`,
    body: `${formatMoney(latest?.payout?.total_amount, latest?.payout?.currency)} · Dernière vente : ${truncate(
      latestEvent,
      90,
    )}`,
    icon: assetUrl(env, 'icons/icon-192.png'),
    badge: assetUrl(env, 'icons/icon-96.png'),
    tag: 'seatshop-sales',
    timestamp: Date.now(),
    requireInteraction: false,
    data: {
      url: saleUrl(env),
    },
  };
}

function testNotification(env: Env): NotificationPayload {
  return {
    title: 'Test SeatShop',
    body: 'Les notifications push fonctionnent. Le cha-ching vous attend dans l’app.',
    icon: assetUrl(env, 'icons/icon-192.png'),
    badge: assetUrl(env, 'icons/icon-96.png'),
    tag: 'seatshop-test',
    timestamp: Date.now(),
    requireInteraction: false,
    data: {
      url: new URL('#/alerts', appUrl(env)).href,
    },
  };
}

async function sendPush(
  subscription: StoredSubscription,
  vapid: VapidRecord,
  message: NotificationPayload,
): Promise<Response> {
  const payload = await buildPushPayload(
    {
      data: message,
      options: {
        ttl: 3600,
        urgency: 'high',
      },
    },
    subscription,
    {
      subject: vapid.subject,
      publicKey: vapid.publicKey,
      privateKey: vapid.privateKey,
    },
  );

  return fetch(subscription.endpoint, payload as unknown as RequestInit);
}

async function broadcast(
  env: Env,
  subscriptions: StoredSubscription[],
  message: NotificationPayload,
): Promise<{ sent: number; failed: number; removed: number; lastError: string | null }> {
  const vapid = await ensureVapid(env);
  let sent = 0;
  let failed = 0;
  let removed = 0;
  let lastError: string | null = null;

  for (const subscription of subscriptions) {
    try {
      const response = await sendPush(subscription, vapid, message);
      if (response.ok) {
        sent += 1;
        continue;
      }
      if (response.status === 404 || response.status === 410) {
        await deleteSubscription(env, subscription.endpoint);
        removed += 1;
        continue;
      }
      failed += 1;
      const text = await response.text().catch(() => '');
      lastError = `Push ${response.status}${text ? `: ${text.slice(0, 160)}` : ''}`;
    } catch (error) {
      failed += 1;
      lastError = `Push : ${maskError(error)}`;
    }
  }

  return { sent, failed, removed, lastError };
}

async function fetchSalesPage(
  env: Env,
  since: string | null,
  cursor?: string,
): Promise<SalesPage> {
  const url = new URL('/v1/sales', API_ROOT);
  url.searchParams.set('limit', '100');
  if (since) url.searchParams.set('created_since', since);
  if (cursor) url.searchParams.set('cursor', cursor);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${env.SEATIKS_API_KEY}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    let detail = '';
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      detail = body?.error?.message ? ` — ${body.error.message}` : '';
    } catch {
      /* ignore */
    }
    throw new Error(`Seatiks a répondu ${response.status}${detail}`);
  }

  return (await response.json()) as SalesPage;
}

async function fetchRecentSales(
  env: Env,
  since: string | null,
): Promise<{ sales: ApiSale[]; hasMore: boolean }> {
  const sales: ApiSale[] = [];
  let cursor: string | undefined;
  let hasMore = false;

  for (let page = 0; page < 5; page += 1) {
    const result = await fetchSalesPage(env, since, cursor);
    const batch = Array.isArray(result.data) ? result.data : [];
    sales.push(...batch);
    hasMore = Boolean(result.has_more && result.next_cursor);
    if (!hasMore) break;
    cursor = result.next_cursor || undefined;
    if (!cursor) break;
  }

  return { sales, hasMore };
}

function newestSaleDate(sales: ApiSale[], fallback: string | null): string | null {
  let newest = fallback;
  for (const sale of sales) {
    if (!sale.created_at) continue;
    if (!newest || Date.parse(sale.created_at) > Date.parse(newest)) newest = sale.created_at;
  }
  return newest;
}

async function fetchLatestSale(
  env: Env,
): Promise<(ApiSale & { id: string; created_at: string }) | null> {
  const { sales } = await fetchRecentSales(env, null);
  let latest: (ApiSale & { id: string; created_at: string }) | null = null;
  for (const sale of sales) {
    if (!sale?.id || !sale?.created_at) continue;
    if (!latest || Date.parse(sale.created_at) > Date.parse(latest.created_at)) {
      latest = sale as ApiSale & { id: string; created_at: string };
    }
  }
  return latest;
}

async function checkSales(env: Env): Promise<void> {
  if (!env.SEATIKS_API_KEY) {
    throw new Error('Le secret SEATIKS_API_KEY n’est pas configuré.');
  }

  const state = await loadState(env);
  const now = new Date();
  const since =
    state.initialized && state.lastCheck
      ? new Date(new Date(state.lastCheck).getTime() - 2 * 60 * 1000).toISOString()
      : null;

  try {
    const { sales } = await fetchRecentSales(env, since);
    const validSales = sales.filter(
      (sale): sale is ApiSale & { id: string; created_at: string } =>
        Boolean(sale?.id && sale?.created_at),
    );
    const seen = new Set(state.seenSales.filter(Boolean));

    // Premier passage : on mémorise l'existant sans notifier les ventes passées.
    if (!state.initialized) {
      state.initialized = true;
      state.seenSales = [...validSales.map((sale) => sale.id), ...state.seenSales].slice(0, 600);
      state.lastSaleAt = newestSaleDate(validSales, state.lastSaleAt);
      state.lastCheck = now.toISOString();
      state.lastSuccessAt = state.lastCheck;
      state.lastError = null;
      await saveState(env, state);
      return;
    }

    const fresh = validSales
      .filter((sale) => !seen.has(sale.id))
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    state.lastSaleAt = newestSaleDate(fresh, state.lastSaleAt);

    state.seenSales = [
      ...validSales.map((sale) => sale.id),
      ...state.seenSales.filter((id) => !validSales.some((sale) => sale.id === id)),
    ].slice(0, 600);

    if (fresh.length) {
      const subscriptions = await listSubscriptions(env);
      if (subscriptions.length) {
        // Évite de spammer 30 notifications après une longue interruption.
        const messages =
          fresh.length > 10
            ? [summaryNotification(env, fresh)]
            : fresh.map((sale) => notificationForSale(env, sale));

        let failed = 0;
        let removed = 0;
        let pushError: string | null = null;

        for (const message of messages) {
          const result = await broadcast(env, subscriptions, message);
          failed += result.failed;
          removed += result.removed;
          if (result.lastError) pushError = result.lastError;
        }

        if (failed || removed) {
          state.lastError = pushError || `${failed} envoi(s) en échec, ${removed} abonnement(s) retiré(s).`;
        } else {
          state.lastError = null;
        }
      } else {
        state.lastError = null;
      }
    } else {
      state.lastError = null;
    }

    state.lastCheck = now.toISOString();
    state.lastSuccessAt = state.lastCheck;
    await saveState(env, state);
  } catch (error) {
    state.lastError = maskError(error);
    state.lastCheck = now.toISOString();
    await saveState(env, state);
    throw error;
  }
}

async function handleConfig(env: Env): Promise<Response> {
  const vapid = await ensureVapid(env);
  const state = await loadState(env);
  return json({
    vapidPublicKey: vapid.publicKey,
    appUrl: appUrl(env),
    initialized: state.initialized,
    subscriptions: await countSubscriptions(env),
  });
}

async function handleSubscribe(request: Request, env: Env): Promise<Response> {
  if (!authorized(request, env)) return errorResponse('Jeton d’abonnement invalide.', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Corps JSON invalide.');
  }

  const subscription = normalizeSubscription(body);
  if (!subscription) {
    return errorResponse('Abonnement push invalide (endpoint HTTPS et clés requis).');
  }

  const key = KV.subscriptionPrefix + (await sha256(subscription.endpoint));
  const existing = await env.SEATSHOP_KV.get<StoredSubscription>(key, 'json');
  const stored: StoredSubscription = {
    ...subscription,
    createdAt: existing?.createdAt || subscription.createdAt,
  };

  await env.SEATSHOP_KV.put(key, JSON.stringify(stored));
  return json({
    ok: true,
    subscribed: true,
    subscriptions: await countSubscriptions(env),
  });
}

async function handleUnsubscribe(request: Request, env: Env): Promise<Response> {
  if (!authorized(request, env)) return errorResponse('Jeton d’abonnement invalide.', 401);

  let body: { endpoint?: unknown };
  try {
    body = (await request.json()) as { endpoint?: unknown };
  } catch {
    return errorResponse('Corps JSON invalide.');
  }
  if (typeof body.endpoint !== 'string' || !body.endpoint.startsWith('https://')) {
    return errorResponse('Endpoint invalide.');
  }

  await deleteSubscription(env, body.endpoint);
  return json({ ok: true, unsubscribed: true });
}

async function handleTest(request: Request, env: Env): Promise<Response> {
  if (!authorized(request, env)) return errorResponse('Jeton d’abonnement invalide.', 401);

  const subscriptions = await listSubscriptions(env);
  if (!subscriptions.length) {
    return json({ ok: true, sent: 0, message: 'Aucun appareil abonné.' });
  }

  const result = await broadcast(env, subscriptions, testNotification(env));
  if (result.failed) {
    return json(
      {
        ok: false,
        sent: result.sent,
        failed: result.failed,
        removed: result.removed,
        error: result.lastError || 'Certains envois ont échoué.',
      },
      502,
    );
  }
  return json({ ok: true, sent: result.sent, removed: result.removed });
}

async function handleNotifyLatest(request: Request, env: Env): Promise<Response> {
  if (!authorized(request, env)) return errorResponse('Jeton d’abonnement invalide.', 401);

  const latest = await fetchLatestSale(env);
  if (!latest) {
    return json(
      { ok: false, sent: 0, failed: 0, removed: 0, error: 'Aucune vente trouvée dans Seatiks.' },
      404,
    );
  }

  const subscriptions = await listSubscriptions(env);
  if (!subscriptions.length) {
    return json({
      ok: true,
      sent: 0,
      failed: 0,
      removed: 0,
      saleId: latest.id,
      createdAt: latest.created_at,
      message: 'Aucun appareil abonné au push.',
    });
  }

  const result = await broadcast(env, subscriptions, notificationForSale(env, latest));
  const state = await loadState(env);

  // Le rattrapage manuel vaut notification : on évite qu’un prochain passage
  // du cron renvoie la même vente aux appareils qui viennent de la recevoir.
  if (result.sent > 0 && !state.seenSales.includes(latest.id)) {
    state.seenSales = [latest.id, ...state.seenSales].slice(0, 600);
  }
  state.lastSaleAt = newestSaleDate([latest], state.lastSaleAt);
  state.lastError =
    result.failed || result.removed
      ? result.lastError || `${result.failed} envoi(s) en échec, ${result.removed} abonnement(s) retiré(s).`
      : null;
  await saveState(env, state);

  if (result.failed) {
    return json(
      {
        ok: false,
        sent: result.sent,
        failed: result.failed,
        removed: result.removed,
        saleId: latest.id,
        createdAt: latest.created_at,
        error: result.lastError || 'Certains envois ont échoué.',
      },
      502,
    );
  }

  return json({
    ok: true,
    sent: result.sent,
    failed: 0,
    removed: result.removed,
    saleId: latest.id,
    createdAt: latest.created_at,
  });
}

async function handleStatus(request: Request, env: Env): Promise<Response> {
  if (!authorized(request, env)) return errorResponse('Jeton d’abonnement invalide.', 401);

  const state = await loadState(env);
  return json({
    ok: true,
    subscriptions: await countSubscriptions(env),
    initialized: state.initialized,
    lastCheck: state.lastCheck,
    lastSaleAt: state.lastSaleAt,
    lastSuccessAt: state.lastSuccessAt,
    lastError: state.lastError,
    appUrl: appUrl(env),
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (request.method === 'GET' && (path === '/' || path === '/api/health')) {
        const state = await loadState(env);
        return json({
          ok: true,
          name: 'SeatShop Push',
          initialized: state.initialized,
          subscriptions: await countSubscriptions(env),
        });
      }
      if (request.method === 'GET' && path === '/api/config') {
        return await handleConfig(env);
      }
      if (request.method === 'GET' && path === '/api/status') {
        return await handleStatus(request, env);
      }
      if (request.method === 'POST' && path === '/api/subscribe') {
        return await handleSubscribe(request, env);
      }
      if (request.method === 'POST' && path === '/api/unsubscribe') {
        return await handleUnsubscribe(request, env);
      }
      if (request.method === 'POST' && path === '/api/test') {
        return await handleTest(request, env);
      }
      if (request.method === 'POST' && path === '/api/notify-latest') {
        return await handleNotifyLatest(request, env);
      }
      return errorResponse('Route introuvable.', 404);
    } catch (error) {
      console.error('SeatShop Push error', error);
      return errorResponse(
        'Le service de notifications a rencontré une erreur. Consultez les logs Cloudflare.',
        500,
      );
    }
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      checkSales(env).catch((error) => {
        console.error('SeatShop sale check failed', error);
      }),
    );
  },
};
