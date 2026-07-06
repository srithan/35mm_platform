import { type Film } from '@/lib/types';
import { type ExternalSearchResult, type ExternalSourceName } from '@/lib/data/externalSourceCore';

export type { ExternalSearchResult, ExternalSourceName };

async function readCatalogResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as { data?: T; error?: string };
  if (!response.ok || payload.error) {
    throw new Error(payload.error || `Catalog lookup failed with ${response.status}`);
  }
  return payload.data as T;
}

export async function searchExternalFilms(query: string, source: ExternalSourceName): Promise<ExternalSearchResult[]> {
  const params = new URLSearchParams({ query, source });
  const response = await fetch(`/api/catalog/external/search?${params.toString()}`, {
    cache: 'no-store',
  });
  return readCatalogResponse<ExternalSearchResult[]>(response);
}

export async function fetchExternalDetails(result: ExternalSearchResult): Promise<Partial<Film>> {
  const response = await fetch('/api/catalog/external/details', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(result),
  });
  return readCatalogResponse<Partial<Film>>(response);
}
