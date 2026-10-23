/* SeatShop service worker — offline shell + Web Push */
const VERSION = 'seatshop-v1.3.0';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const scope = self.registration.scope;
const url = (path) => new URL(path, scope).toString();

const SHELL = [
  url('./'),
  url('index.html'),
  url('manifest.webmanifest'),
  url('favicon.png'),
  url('icons/icon-192.png'),
  url('icons/icon-512.png'),
  url('icons/apple-touch-icon.png'),
  url('sounds/shopify-sale.mp3'),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.allSettled(SHELL.map((item) => cache.add(new Request(item, { cache: 'reload' }))));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('seatshop-') && !key.startsWith(VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(url('index.html'), response.clone());
    }
    return response;
  } catch {
    const cached = (await cache.match(url('index.html'))) || (await cache.match(url('./')));
    if (cached) return cached;
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>SeatShop hors ligne</title><body style="font-family:system-ui;padding:40px;text-align:center"><h1>Vous êtes hors ligne</h1><p>Ouvrez SeatShop une première fois avec une connexion pour installer l’application.</p></body>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const shell = await caches.open(SHELL_CACHE);
  const cached = (await cache.match(request)) || (await shell.match(request));
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok && response.type === 'basic') {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;
  if (requestUrl.pathname.endsWith('/sw.js')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function showPushNotification(payload) {
  const data = payload || {};
  const options = {
    body: data.body || '',
    icon: data.icon || url('icons/icon-192.png'),
    badge: data.badge || url('icons/icon-96.png'),
    image: data.image || undefined,
    tag: data.tag || 'seatshop-sale',
    renotify: data.renotify !== false,
    requireInteraction: Boolean(data.requireInteraction),
    silent: false,
    timestamp: data.timestamp || Date.now(),
    data: {
      url: data.data?.url || data.url || url('./#/'),
      ...(data.data || {}),
    },
  };

  if (data.actions && Array.isArray(data.actions)) {
    options.actions = data.actions;
  }

  const registration = self.registration;
  await registration.showNotification(data.title || 'SeatShop', options);

  if ('setAppBadge' in navigator) {
    try {
      const count = Number(data.badgeCount || 0);
      if (count > 0) await navigator.setAppBadge(count);
    } catch {
      /* ignore */
    }
  }
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'SeatShop', body: event.data ? event.data.text() : 'Nouvelle activité' };
  }

  event.waitUntil(showPushNotification(payload));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || url('./#/alerts');
  const targetUrl = new URL(target, scope);

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if (client.url.startsWith(scope) && new URL(client.url).origin === targetUrl.origin) {
          await client.focus();
          if ('navigate' in client) {
            try {
              await client.navigate(targetUrl.href);
            } catch {
              /* ignore */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl.href);
    })(),
  );
});

self.addEventListener('notificationclose', () => {
  /* no-op */
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (data.type === 'SHOW_NOTIFICATION') {
    event.waitUntil(showPushNotification(data.payload));
  }
});
