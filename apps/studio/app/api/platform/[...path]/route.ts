import { NextResponse } from 'next/server';

const API_URL = (process.env.PLATFORM_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/u, '');
const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

function jsonError(status: number, code: string, message: string, details?: Record<string, string>) {
  return NextResponse.json(
    {
      code,
      message,
      ...(details ? { details } : {}),
    },
    {
      status,
      headers: {
        'cache-control': 'no-store',
      },
    },
  );
}

function targetBaseUrl(request: Request): URL | null {
  try {
    const target = new URL(API_URL);
    const source = new URL(request.url);
    if (target.origin === source.origin && target.pathname.startsWith('/api/platform')) {
      return null;
    }
    return target;
  } catch (_error) {
    return null;
  }
}

function forwardHeaders(request: Request): Headers {
  const headers = new Headers();
  const authorization = request.headers.get('authorization');
  const idempotencyKey = request.headers.get('idempotency-key');
  const contentType = request.headers.get('content-type');

  headers.set('accept', 'application/json');
  if (authorization) headers.set('authorization', authorization);
  if (idempotencyKey) headers.set('idempotency-key', idempotencyKey);
  if (contentType) headers.set('content-type', contentType);

  return headers;
}

async function proxy(request: Request, context: RouteContext) {
  const params = await context.params;
  const path = '/' + (params.path ?? []).join('/');
  const sourceUrl = new URL(request.url);
  const baseUrl = targetBaseUrl(request);
  if (!baseUrl) {
    return jsonError(
      500,
      'PLATFORM_PROXY_MISCONFIGURED',
      'Studio platform proxy target must be an absolute Hono API origin, not the Studio app itself.',
      { target: API_URL },
    );
  }

  const targetUrl = new URL(path + sourceUrl.search, baseUrl).toString();
  const method = request.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method,
      headers: forwardHeaders(request),
      body: hasBody ? await request.text() : undefined,
      cache: 'no-store',
    });
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'Could not reach platform API.';
    return jsonError(502, 'PLATFORM_PROXY_UPSTREAM_UNREACHABLE', message, { target: targetUrl });
  }

  const body = await response.text();
  const contentType = response.headers.get('content-type') ?? JSON_CONTENT_TYPE;
  if (!response.ok && !contentType.includes('application/json')) {
    return jsonError(
      response.status,
      'PLATFORM_PROXY_UPSTREAM_NON_JSON_ERROR',
      `${method} ${path} returned ${response.status} ${response.statusText} from platform API target.`,
      { target: targetUrl },
    );
  }

  return new NextResponse(body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      'cache-control': 'no-store',
      'content-type': contentType,
      'x-35mm-platform-target': baseUrl.origin,
    },
  });
}

export async function GET(request: Request, context: RouteContext) {
  return proxy(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxy(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxy(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxy(request, context);
}
