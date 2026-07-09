import type {
  CatalogEditMutationResult,
  CatalogExternalIdRow,
  CatalogTitleCard,
  CatalogTitleDetail,
} from '@35mm/types';
import type { CatalogOperationInput } from '@35mm/validators';
import type { Film, FilmFilters } from '@/lib/types';
import type { FilmFormValues } from '@/lib/schemas';
import { randomUlid } from '@/lib/utils';

function catalogApiUrl(): string {
  const fallback = '/api/platform';

  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (typeof window !== 'undefined') {
    if (raw) {
      try {
        const url = new URL(raw);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          return raw.replace(/\/$/u, '');
        }
      } catch (_error) {
        return fallback;
      }
    }

    if (window.location.hostname === 'localhost' && window.location.port === '3001') {
      return 'http://localhost:4000';
    }

    return fallback;
  }

  if (!raw) return fallback;

  try {
    const url = new URL(raw);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return raw.replace(/\/$/u, '');
    }
  } catch (_error) {
    return fallback;
  }

  return fallback;
}

const API_URL = catalogApiUrl();

type CatalogTitlePage = {
  items: CatalogTitleCard[];
  nextCursor: string | null;
  hasMore: boolean;
};

type CatalogTitleDetailResponse = CatalogTitleDetail;

type CatalogMutationOptions = {
  token: string | null;
};

export class CatalogApiError extends Error {
  status: number;
  code?: string;
  path?: string;
  method?: string;

  constructor(message: string, status: number, code?: string, details?: { path?: string; method?: string }) {
    super(message);
    this.name = 'CatalogApiError';
    this.status = status;
    this.code = code;
    this.path = details?.path;
    this.method = details?.method;
  }
}

function textList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function externalId(rows: CatalogExternalIdRow[] | undefined, provider: 'imdb' | 'tmdb'): string | null {
  return rows?.find((row) => row.provider === provider)?.externalId ?? null;
}

function titleCardToFilm(card: CatalogTitleCard, detail?: Partial<CatalogTitleDetail>): Film {
  const facts = detail?.facts ?? {};
  return {
    id: card.id,
    title: card.primaryTitle,
    originalTitle: card.originalTitle,
    sortTitle: card.sortTitle,
    slug: card.slug,
    type: card.type,
    status: card.status,
    lifecycle: (detail?.lifecycle as Film['lifecycle'] | undefined) ?? 'released',
    imdbId: externalId(detail?.externalIds, 'imdb'),
    tmdbId: externalId(detail?.externalIds, 'tmdb'),
    posterUrl: card.primaryMedia?.url,
    releaseYear: card.startYear ?? undefined,
    endYear: card.endYear,
    releaseDate: card.releaseDate,
    runtimeMinutes: card.runtimeMinutes,
    primaryLanguage: card.primaryLanguage,
    primaryCountry: card.primaryCountry,
    languages: detail?.spokenLanguages ?? [],
    countries: detail?.originCountries ?? [],
    genres: textList(facts.genres),
    contentWarnings: textList(facts.contentWarnings),
    directors: [],
    writers: [],
    cast: [],
    synopsis: detail?.synopsis ?? null,
    facts,
    isAdult: card.isAdult,
    isVerified: card.isVerified,
    primaryMedia: card.primaryMedia,
    externalIds: detail?.externalIds ?? [],
    dateAdded: detail?.createdAt ?? '',
    createdAt: detail?.createdAt ?? '',
    updatedAt: detail?.updatedAt ?? '',
  };
}

async function readJson<T>(
  response: Response,
  request: { path: string; method: string },
): Promise<T> {
  if (!response.ok) {
    let message = response.statusText || 'Catalog request failed';
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
        code = 'CATALOG_API_NON_JSON_ERROR';
      }
    } catch (_error) {
      // keep status text
    }
    throw new CatalogApiError(
      `${request.method} ${API_URL}${request.path} failed (${response.status}): ${message}`,
      response.status,
      code,
      request,
    );
  }

  return (await response.json()) as T;
}

async function catalogRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    token?: string | null;
    body?: unknown;
    idempotencyKey?: string;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const method = options.method ?? 'GET';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
    });
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'Could not reach catalog API';
    throw new CatalogApiError(
      `${method} ${API_URL}${path} failed: ${message === 'Failed to fetch' ? 'Could not reach catalog API' : message}`,
      0,
      'NETWORK_ERROR',
      { path, method },
    );
  }

  return readJson<T>(response, { path, method });
}

function authTokenOrThrow(token: string | null): string {
  if (!token) {
    throw new CatalogApiError('Studio sign-in token missing', 401, 'UNAUTHORIZED');
  }
  return token;
}

export async function listCatalogFilms(
  filters: FilmFilters,
  cursor: string | null,
  limit: number,
): Promise<{ items: Film[]; nextCursor: string | null; hasMore: boolean }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (filters.search.trim()) params.set('query', filters.search.trim());
  if (filters.type) params.set('type', filters.type);
  if (filters.year) params.set('year', String(filters.year));
  if (cursor) params.set('cursor', cursor);

  const page = await catalogRequest<CatalogTitlePage>(`/v1/catalog/titles?${params.toString()}`);
  return {
    ...page,
    items: page.items.map((item) => titleCardToFilm(item)),
  };
}

export async function getCatalogFilm(id: string): Promise<Film> {
  const detail = await catalogRequest<CatalogTitleDetailResponse>(`/v1/catalog/titles/${encodeURIComponent(id)}`);
  return titleCardToFilm(detail, detail);
}

function nullableText(value: string | undefined): string | null | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function titleData(values: FilmFormValues) {
  return {
    type: values.type,
    lifecycle: values.lifecycle,
    status: values.status,
    primaryTitle: values.title.trim(),
    originalTitle: nullableText(values.originalTitle),
    sortTitle: values.sortTitle.trim(),
    slug: values.slug.trim(),
    synopsis: nullableText(values.synopsis),
    startYear: values.startYear ?? null,
    endYear: values.endYear ?? null,
    releaseDate: nullableText(values.releaseDate),
    runtimeMinutes: values.runtimeMinutes ?? null,
    primaryLanguage: nullableText(values.primaryLanguage),
    primaryCountry: nullableText(values.primaryCountry),
    originCountries: values.originCountries,
    spokenLanguages: values.spokenLanguages,
    facts: {
      genres: values.genres,
      contentWarnings: values.contentWarnings,
    },
    isAdult: values.isAdult,
    isVerified: values.isVerified,
  };
}

function upsertExternalIdOperation(
  current: Film | null,
  titleId: string,
  provider: 'imdb' | 'tmdb',
  value: string,
): CatalogOperationInput | null {
  const trimmed = value.trim();
  const existing = current?.externalIds.find((row) => row.provider === provider);

  if (existing && !trimmed) {
    return { entityType: 'external_id', action: 'delete', entityId: existing.id, data: {} };
  }

  if (!trimmed) return null;

  const data = {
    entityType: 'title' as const,
    entityId: titleId,
    provider,
    externalId: trimmed,
    isPrimary: provider === 'imdb',
    status: 'active' as const,
  };

  return existing
    ? { entityType: 'external_id', action: 'update', entityId: existing.id, data }
    : { entityType: 'external_id', action: 'create', entityId: randomUlid(), data };
}

function posterOperation(current: Film | null, titleId: string, posterUrl: string): CatalogOperationInput | null {
  const trimmed = posterUrl.trim();
  const existing = current?.primaryMedia?.type === 'poster' ? current.primaryMedia : null;

  if (existing && !trimmed) {
    return { entityType: 'media_asset', action: 'delete', entityId: existing.id, data: {} };
  }

  if (!trimmed) return null;

  const data = {
    entityType: 'title' as const,
    entityId: titleId,
    type: 'poster' as const,
    source: 'external_url' as const,
    url: trimmed,
    title: `${current?.title ?? 'Title'} poster`,
    sortOrder: 0,
    isPrimary: true,
    status: 'active' as const,
  };

  return existing
    ? { entityType: 'media_asset', action: 'update', entityId: existing.id, data }
    : { entityType: 'media_asset', action: 'create', entityId: randomUlid(), data };
}

function mutationBody(action: 'create' | 'update' | 'delete', titleId: string, values?: FilmFormValues, current?: Film | null) {
  if (action === 'delete') {
    return {
      summary: `Delete catalog title ${titleId}`,
      publicVisible: true,
      operations: [{ entityType: 'title', action: 'delete', entityId: titleId, data: {} }],
      sources: [],
    };
  }

  if (!values) {
    throw new CatalogApiError('Catalog title values missing', 400, 'BAD_REQUEST');
  }

  const operations: CatalogOperationInput[] = [
    {
      entityType: 'title',
      action,
      entityId: titleId,
      data: titleData(values),
      publicVisible: true,
    },
  ];

  const poster = posterOperation(current ?? null, titleId, values.posterUrl);
  if (poster) operations.push(poster);

  const imdb = upsertExternalIdOperation(current ?? null, titleId, 'imdb', values.imdbId);
  if (imdb) operations.push(imdb);

  const tmdb = upsertExternalIdOperation(current ?? null, titleId, 'tmdb', values.tmdbId);
  if (tmdb) operations.push(tmdb);

  return {
    summary: `${action === 'create' ? 'Create' : 'Update'} catalog title ${values.title.trim()}`,
    publicVisible: true,
    operations,
    sources: [],
  };
}

function idempotencyKey(action: string, id: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : randomUlid();
  return `studio:${action}:title:${id}:${random}`;
}

export async function createCatalogFilm(values: FilmFormValues, options: CatalogMutationOptions): Promise<Film> {
  const token = authTokenOrThrow(options.token);
  const titleId = randomUlid();
  const result = await catalogRequest<CatalogEditMutationResult>('/v1/catalog/titles', {
    method: 'POST',
    token,
    idempotencyKey: idempotencyKey('create', titleId),
    body: mutationBody('create', titleId, values, null),
  });
  if (result.edit.status !== 'applied') {
    throw new CatalogApiError(
      'Catalog edit queued for review. Add studioRole catalog, admin, or owner to this Studio Clerk user to publish directly.',
      202,
      'CATALOG_EDIT_PENDING_REVIEW',
    );
  }
  return getCatalogFilm(titleId);
}

export async function updateCatalogFilm(current: Film, values: FilmFormValues, options: CatalogMutationOptions): Promise<Film> {
  const token = authTokenOrThrow(options.token);
  const result = await catalogRequest<CatalogEditMutationResult>('/v1/catalog/titles', {
    method: 'POST',
    token,
    idempotencyKey: idempotencyKey('update', current.id),
    body: mutationBody('update', current.id, values, current),
  });
  if (result.edit.status !== 'applied') {
    throw new CatalogApiError(
      'Catalog edit queued for review. Add studioRole catalog, admin, or owner to this Studio Clerk user to publish directly.',
      202,
      'CATALOG_EDIT_PENDING_REVIEW',
    );
  }
  return getCatalogFilm(current.id);
}

export async function deleteCatalogFilm(id: string, options: CatalogMutationOptions): Promise<string> {
  const token = authTokenOrThrow(options.token);
  await catalogRequest<CatalogEditMutationResult>(`/v1/catalog/titles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
    idempotencyKey: idempotencyKey('delete', id),
    body: { summary: `Delete catalog title ${id}` },
  });
  return id;
}
