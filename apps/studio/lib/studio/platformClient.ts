const PLATFORM_FALLBACK = '/api/platform';

function readEnvApiUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return raw.replace(/\/$/u, '');
    }
  } catch (_error) {
    return undefined;
  }
  return undefined;
}

/**
 * Resolves the 35mm platform (Hono) API base URL for Studio clients.
 *
 * Mirrors the catalog client behavior: prefer an absolute NEXT_PUBLIC_API_URL,
 * fall back to the local Hono origin when developing Studio on :3001, otherwise
 * route through the same-origin `/api/platform` proxy (which reads
 * PLATFORM_API_URL server-side).
 */
export function resolvePlatformApiUrl(): string {
  const fromEnv = readEnvApiUrl();

  if (typeof window !== 'undefined') {
    if (fromEnv) return fromEnv;
    if (window.location.hostname === 'localhost' && window.location.port === '3001') {
      return 'http://localhost:4000';
    }
    return PLATFORM_FALLBACK;
  }

  return fromEnv ?? PLATFORM_FALLBACK;
}

export class PlatformApiError extends Error {
  status: number;
  code?: string;
  path?: string;
  method?: string;

  constructor(message: string, status: number, code?: string, details?: { path?: string; method?: string }) {
    super(message);
    this.name = 'PlatformApiError';
    this.status = status;
    this.code = code;
    this.path = details?.path;
    this.method = details?.method;
  }
}

export interface PlatformRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  token?: string | null;
  body?: unknown;
  idempotencyKey?: string;
}

async function readError(response: Response, request: { path: string; method: string }, baseUrl: string): Promise<never> {
  let message = response.statusText || 'Platform request failed';
  let code: string | undefined;
  const contentType = response.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as { message?: string; code?: string };
      if (payload.message) message = payload.message;
      if (payload.code) code = payload.code;
    } else {
      const text = (await response.text()).trim();
      if (text) {
        message = text.replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').slice(0, 240);
      }
      code = 'PLATFORM_API_NON_JSON_ERROR';
    }
  } catch (_error) {
    // keep status text
  }
  throw new PlatformApiError(
    `${request.method} ${baseUrl}${request.path} failed (${response.status}): ${message}`,
    response.status,
    code,
    request,
  );
}

export async function platformRequest<T>(path: string, options: PlatformRequestOptions = {}): Promise<T> {
  const baseUrl = resolvePlatformApiUrl();
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
    });
  } catch (error) {
    const raw = error instanceof Error && error.message ? error.message : 'Could not reach platform API';
    throw new PlatformApiError(
      `${method} ${baseUrl}${path} failed: ${raw === 'Failed to fetch' ? 'Could not reach platform API' : raw}`,
      0,
      'NETWORK_ERROR',
      { path, method },
    );
  }

  if (!response.ok) {
    return readError(response, { path, method }, baseUrl);
  }

  return (await response.json()) as T;
}
