export const SOUND_URL = new URL(
  `${import.meta.env.BASE_URL}sounds/shopify-sale.mp3`,
  window.location.origin,
).href;

let audio: HTMLAudioElement | null = null;
let audioUnlocked = false;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(SOUND_URL);
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.volume = 0.8;
  }
  return audio;
}

export function unlockSound(): void {
  if (audioUnlocked) return;
  try {
    const element = getAudio();
    element.muted = true;
    const promise = element.play();
    if (promise) {
      promise
        .then(() => {
          element.pause();
          element.currentTime = 0;
          element.muted = false;
          audioUnlocked = true;
        })
        .catch(() => {
          element.muted = false;
        });
    } else {
      element.muted = false;
      audioUnlocked = true;
    }
  } catch {
    /* audio unavailable */
  }
}

export function installAudioUnlock(): () => void {
  const handler = () => {
    unlockSound();
  };
  window.addEventListener('pointerdown', handler, { once: true, passive: true });
  window.addEventListener('keydown', handler, { once: true });
  return () => {
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('keydown', handler);
  };
}

export async function playSaleSound(volume = 0.8, force = false): Promise<boolean> {
  try {
    const element = getAudio();
    element.muted = false;
    element.volume = Math.min(1, Math.max(0, volume));
    element.currentTime = 0;
    await element.play();
    audioUnlocked = true;
    return true;
  } catch {
    if (force) unlockSound();
    return false;
  }
}

export function vibrate(): void {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([70, 45, 110]);
    } catch {
      /* ignore */
    }
  }
}

export function isInstalledPwa(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isSafari(): boolean {
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

export function notificationsSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

type ShowNotificationInput = {
  title: string;
  body: string;
  saleId?: string;
  url?: string;
  tag?: string;
  silent?: boolean;
};

export async function showSystemNotification(input: ShowNotificationInput): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false;
  const url = input.url || `${window.location.origin}${import.meta.env.BASE_URL}#/sales/${input.saleId || ''}`;
  const options: NotificationOptions = {
    body: input.body,
    icon: `${window.location.origin}${import.meta.env.BASE_URL}icons/icon-192.png`,
    badge: `${window.location.origin}${import.meta.env.BASE_URL}icons/icon-96.png`,
    tag: input.tag || `sale-${input.saleId || Date.now()}`,
    data: { url, saleId: input.saleId },
    silent: input.silent ?? false,
  };
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(input.title, options);
    return true;
  } catch {
    try {
      new Notification(input.title, options);
      return true;
    } catch {
      return false;
    }
  }
}

export async function setAppBadgeCount(count: number): Promise<void> {
  try {
    const nav = navigator as Navigator & {
      setAppBadge?: (contents?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (count > 0 && nav.setAppBadge) await nav.setAppBadge(count);
    else if (nav.clearAppBadge) await nav.clearAppBadge();
  } catch {
    /* ignore */
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  const devWithSw = import.meta.env.DEV && new URLSearchParams(window.location.search).has('sw');
  if (import.meta.env.DEV && !devWithSw) return null;

  try {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: import.meta.env.BASE_URL,
    });
    return registration;
  } catch (error) {
    console.warn('Service worker registration failed', error);
    return null;
  }
}

export type PushConfig = {
  vapidPublicKey: string;
  appUrl?: string;
};

export type PushServerStatus = {
  ok?: boolean;
  subscriptions?: number;
  lastCheck?: string | null;
  lastError?: string | null;
  lastSaleAt?: string | null;
  initialized?: boolean;
};

function normalizeServer(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function tokenHeaders(token?: string): Record<string, string> {
  return token ? { 'X-SeatShop-Token': token } : {};
}

async function serverFetch<T>(
  serverUrl: string,
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${normalizeServer(serverUrl)}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...tokenHeaders(token),
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    const text = await response.text();
    let body: { error?: unknown } & Record<string, unknown> = {};
    if (text) {
      try {
        body = JSON.parse(text) as typeof body;
      } catch {
        const plainText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        body = { error: plainText.slice(0, 180) };
      }
    }
    if (!response.ok) {
      const message = typeof body.error === 'string' && body.error ? body.error : null;
      throw new Error(message || `Le serveur a répondu ${response.status}.`);
    }
    return body as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Le serveur de notifications ne répond pas.');
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function fetchPushConfig(serverUrl: string, token?: string): Promise<PushConfig> {
  const config = await serverFetch<PushConfig>(serverUrl, '/api/config', {}, token);
  if (!config?.vapidPublicKey) {
    throw new Error('Le serveur ne renvoie pas de clé VAPID.');
  }
  return config;
}

export async function fetchPushServerStatus(
  serverUrl: string,
  token?: string,
): Promise<PushServerStatus> {
  return serverFetch<PushServerStatus>(serverUrl, '/api/status', {}, token);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function subscribeToPush(
  serverUrl: string,
  token?: string,
): Promise<PushSubscription> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error("Les notifications push ne sont pas disponibles sur ce navigateur.");
  }
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Les notifications sont bloquées dans les réglages de votre téléphone.'
        : "Vous devez autoriser les notifications pour continuer.",
    );
  }

  const config = await fetchPushConfig(serverUrl, token);
  const registration = await navigator.serviceWorker.ready;
  const applicationServerKey = urlBase64ToUint8Array(config.vapidPublicKey);
  let subscription = await registration.pushManager.getSubscription();

  // Si le Worker a régénéré ses clés VAPID (nouveau KV), l'ancien abonnement
  // ne pourra plus recevoir de push : on le remplace par un abonnement neuf.
  if (subscription?.options.applicationServerKey) {
    const currentKey = new Uint8Array(subscription.options.applicationServerKey);
    const keyChanged =
      currentKey.length !== applicationServerKey.length ||
      currentKey.some((byte, index) => byte !== applicationServerKey[index]);
    if (keyChanged) {
      await subscription.unsubscribe();
      subscription = null;
    }
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  await serverFetch(
    serverUrl,
    '/api/subscribe',
    {
      method: 'POST',
      body: JSON.stringify({
        ...subscription.toJSON(),
        device: navigator.userAgent,
      }),
    },
    token,
  );

  return subscription;
}

export async function unsubscribeFromPush(serverUrl: string, token?: string): Promise<void> {
  const subscription = await currentPushSubscription();
  if (!subscription) return;
  try {
    await serverFetch(
      serverUrl,
      '/api/unsubscribe',
      {
        method: 'POST',
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      },
      token,
    );
  } finally {
    await subscription.unsubscribe();
  }
}

export async function sendTestPush(serverUrl: string, token?: string): Promise<{ sent?: number }> {
  return serverFetch<{ sent?: number }>(serverUrl, '/api/test', { method: 'POST' }, token);
}
