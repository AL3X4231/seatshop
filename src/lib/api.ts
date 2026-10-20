import type {
  ApiErrorBody,
  EventDetail,
  EventSummary,
  ListResponse,
  Listing,
  Me,
  Sale,
} from './types';

export const API_BASE = 'https://api.seatiks.com';

export class ApiError extends Error {
  status: number;
  code: string;
  requestId: string | null;
  details: unknown;

  constructor(message: string, options: { status?: number; code?: string; requestId?: string | null; details?: unknown } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status ?? 0;
    this.code = options.code ?? 'unknown';
    this.requestId = options.requestId ?? null;
    this.details = options.details;
  }
}

function friendlyMessage(status: number, body: ApiErrorBody | null): string {
  const code = body?.error?.code;
  const serverMessage = body?.error?.message;
  if (status === 401) return 'Clé API invalide ou révoquée. Vérifiez-la dans vos réglages Seatiks.';
  if (code === 'insufficient_scope') {
    return "Cette clé API n'a pas le scope nécessaire pour cette action.";
  }
  if (code === 'live_access_required') {
    return "L'accès aux données live n'est pas activé pour cette clé.";
  }
  if (status === 403) {
    return serverMessage || "Cette clé API n'a pas accès à cette ressource.";
  }
  if (status === 404) return 'Cette ressource est introuvable.';
  if (status === 429) return 'Trop de requêtes envoyées à Seatiks. Patientez un instant.';
  if (status >= 500) return 'Seatiks est momentanément indisponible. Réessayez dans quelques instants.';
  return serverMessage || `La requête a échoué (HTTP ${status}).`;
}

type RequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

async function request<T>(
  path: string,
  apiKey: string,
  options: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? 20000);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    let body: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
    }

    if (!response.ok) {
      const errorBody = body as ApiErrorBody | null;
      throw new ApiError(friendlyMessage(response.status, errorBody), {
        status: response.status,
        code: errorBody?.error?.code,
        requestId: errorBody?.request_id || response.headers.get('x-request-id'),
        details: errorBody?.error?.details,
      });
    }

    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (options.signal?.aborted) {
        throw new ApiError('Requête annulée.', { code: 'aborted' });
      }
      throw new ApiError('Seatiks met trop de temps à répondre. Réessayez.', { code: 'timeout' });
    }
    throw new ApiError('Connexion à Seatiks impossible. Vérifiez votre réseau.', {
      code: 'network',
    });
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

function query(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const api = {
  me: (key: string, signal?: AbortSignal) => request<Me>('/v1/me', key, { signal }),

  sales: (
    key: string,
    params: {
      status?: string;
      event_id?: string;
      created_since?: string;
      marketplace?: string;
      limit?: number;
      cursor?: string;
    } = {},
    signal?: AbortSignal,
  ) => request<ListResponse<Sale>>(`/v1/sales${query(params)}`, key, { signal }),

  sale: (key: string, id: string, signal?: AbortSignal) =>
    request<Sale>(`/v1/sales/${encodeURIComponent(id)}`, key, { signal }),

  listings: (
    key: string,
    params: {
      event_id?: string;
      status?: string;
      created_since?: string;
      limit?: number;
      cursor?: string;
    } = {},
    signal?: AbortSignal,
  ) => request<ListResponse<Listing>>(`/v1/listings${query(params)}`, key, { signal }),

  listing: (key: string, id: string, signal?: AbortSignal) =>
    request<Listing>(`/v1/listings/${encodeURIComponent(id)}`, key, { signal }),

  events: (
    key: string,
    params: {
      q?: string;
      date_from?: string;
      date_to?: string;
      country?: string;
      listable?: boolean;
      limit?: number;
      cursor?: string;
    } = {},
    signal?: AbortSignal,
  ) => request<ListResponse<EventSummary>>(`/v1/events${query(params)}`, key, { signal }),

  event: (key: string, id: string, signal?: AbortSignal) =>
    request<EventDetail>(`/v1/events/${encodeURIComponent(id)}`, key, { signal }),
};

export async function fetchAllPages<T>(
  fetchPage: (cursor?: string) => Promise<ListResponse<T>>,
  maxPages = 10,
): Promise<{ data: T[]; hasMore: boolean }> {
  const all: T[] = [];
  let cursor: string | undefined;
  let hasMore = false;

  for (let page = 0; page < maxPages; page += 1) {
    const result = await fetchPage(cursor);
    if (!result || !Array.isArray(result.data)) break;
    all.push(...result.data);
    hasMore = Boolean(result.has_more && result.next_cursor);
    if (!hasMore) break;
    cursor = result.next_cursor || undefined;
    if (!cursor) break;
  }

  return { data: all, hasMore };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'aborted';
}

export function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Une erreur inattendue est survenue.';
}
