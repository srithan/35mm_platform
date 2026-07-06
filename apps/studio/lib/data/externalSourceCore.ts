import { type Film } from '@/lib/types';

export type ExternalSourceName = 'TMDB' | 'OMDb' | 'IMDb ID' | 'Open Library';

export type ExternalSearchResult = {
  id: string;
  title: string;
  year?: number;
  type: Film['type'];
  poster?: string;
  source: ExternalSourceName;
  payload: Record<string, unknown>;
};

function mapTmdbType(mediaType: string): Film['type'] {
  if (mediaType === 'tv') {
    return 'tv-show';
  }
  return 'feature';
}

function mapOmdbType(type: string): Film['type'] {
  const normalized = type.toLowerCase();
  if (normalized === 'series' || normalized === 'episode') {
    return 'tv-show';
  }
  return 'feature';
}

function ensureTmdbYear(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const year = Number.parseInt(value.slice(0, 4), 10);
  return Number.isNaN(year) ? undefined : year;
}

function toPartialText(value?: string): string | undefined {
  if (!value || value === 'N/A') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toInt(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function getTmdbKey(): string {
  const key = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!key) {
    throw new Error('TMDB key missing. Add NEXT_PUBLIC_TMDB_API_KEY or TMDB_API_KEY to .env.');
  }
  return key;
}

function getOmdbKey(): string {
  const key = process.env.OMDB_API_KEY || process.env.NEXT_PUBLIC_OMDB_API_KEY;
  if (!key) {
    throw new Error('OMDb key missing. Add NEXT_PUBLIC_OMDB_API_KEY or OMDB_API_KEY to .env.');
  }
  return key;
}

async function readJson<T>(response: Response, source: string): Promise<T> {
  const raw = (await response.json()) as T & { status_message?: string; Error?: string; Response?: string };
  if (!response.ok) {
    throw new Error(raw.status_message || raw.Error || `${source} request failed with ${response.status}`);
  }
  if (raw.Response === 'False' && raw.Error) {
    throw new Error(raw.Error);
  }
  return raw;
}

export async function searchExternalFilmsServer(query: string, source: ExternalSourceName): Promise<ExternalSearchResult[]> {
  const clean = query.trim();
  if (!clean) {
    return [];
  }

  if (source === 'TMDB') {
    const tmdbKey = getTmdbKey();
    const response = await fetch(`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(clean)}&api_key=${tmdbKey}`, {
      cache: 'no-store',
    });
    const raw = await readJson<{
      results?: Array<{ id: number; title?: string; name?: string; poster_path?: string; first_air_date?: string; release_date?: string; media_type?: string }>;
    }>(response, 'TMDB');

    return (raw.results || []).slice(0, 18).map((item) => {
      const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
      const yearString = mediaType === 'tv' ? item.first_air_date : item.release_date;
      return {
        id: String(item.id),
        source: 'TMDB',
        title: item.title || item.name || 'Unknown title',
        year: ensureTmdbYear(yearString),
        type: mapTmdbType(mediaType),
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : undefined,
        payload: item,
      };
    });
  }

  if (source === 'OMDb') {
    const omdbKey = getOmdbKey();
    const response = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(clean)}&apikey=${omdbKey}`, {
      cache: 'no-store',
    });
    const raw = await readJson<{
      Search?: Array<{ imdbID: string; Title: string; Year: string; Poster: string; Type: string }>;
      Error?: string;
      Response?: string;
    }>(response, 'OMDb');

    return (raw.Search || []).slice(0, 12).map((item) => ({
      id: item.imdbID,
      source: 'OMDb',
      title: item.Title,
      year: Number.parseInt(item.Year, 10) || undefined,
      type: mapOmdbType(item.Type),
      poster: item.Poster && item.Poster !== 'N/A' ? item.Poster : undefined,
      payload: item,
    }));
  }

  if (source === 'IMDb ID') {
    const cleanImdb = clean.trim();
    if (!/^tt\d{7,8}$/u.test(cleanImdb)) {
      throw new Error('IMDb ID must look like tt1234567');
    }

    const omdbKey = getOmdbKey();
    const response = await fetch(`https://www.omdbapi.com/?i=${cleanImdb}&apikey=${omdbKey}`, {
      cache: 'no-store',
    });
    const raw = await readJson<Record<string, string>>(response, 'OMDb');

    return [
      {
        id: cleanImdb,
        source: 'IMDb ID',
        title: String(raw.Title || 'Unknown title'),
        year: Number.parseInt(raw.Year || '0', 10) || undefined,
        type: mapOmdbType(String(raw.Type || 'movie')),
        poster: raw.Poster && raw.Poster !== 'N/A' ? raw.Poster : undefined,
        payload: raw,
      },
    ];
  }

  const response = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(clean)}&limit=12`, {
    cache: 'no-store',
  });
  const raw = await readJson<{
    docs?: Array<{ key: string; title: string; first_publish_year?: number; cover_i?: number; description?: string }>;
  }>(response, 'Open Library');

  return (raw.docs || []).slice(0, 12).map((item) => ({
    id: item.key || `openlibrary-${Math.random().toString(36).slice(2, 9)}`,
    source: 'Open Library',
    title: item.title,
    year: item.first_publish_year,
    type: 'feature',
    poster: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : undefined,
    payload: item,
  }));
}

export async function fetchExternalDetailsServer(result: ExternalSearchResult): Promise<Partial<Film>> {
  if (result.source === 'TMDB') {
    const tmdbKey = getTmdbKey();
    const idNum = Number.parseInt(result.id, 10);
    const mediaType = result.type === 'tv-show' ? 'tv' : 'movie';
    const response = await fetch(`https://api.themoviedb.org/3/${mediaType}/${idNum}?api_key=${tmdbKey}&append_to_response=credits`, {
      cache: 'no-store',
    });
    const raw = await readJson<{
      title?: string;
      original_title?: string;
      name?: string;
      original_name?: string;
      release_date?: string;
      first_air_date?: string;
      runtime?: number;
      episode_run_time?: number[];
      number_of_seasons?: number;
      number_of_episodes?: number;
      genres?: Array<{ name: string }>;
      poster_path?: string;
      backdrop_path?: string;
      overview?: string;
      tagline?: string;
      id?: number;
      credits?: {
        crew?: Array<{ name?: string; job?: string; original_name?: string }>;
        cast?: Array<{ name?: string; character?: string; order?: number }>;
      };
    }>(response, 'TMDB');

    const cast = (raw.credits?.cast || [])
      .slice(0, 10)
      .map((member) => ({
        name: member.name?.trim() || '',
        character: member.character?.trim() || undefined,
        billingOrder: member.order,
      }))
      .filter((member) => member.name.length > 0);

    const directors = (raw.credits?.crew || [])
      .filter((person) => person.job === 'Director')
      .map((person) => ({ name: person.name || person.original_name || '' }))
      .filter((person) => person.name.length > 0);

    const writers = (raw.credits?.crew || [])
      .filter((person) => Boolean(person.job && (person.job.toLowerCase().includes('writer') || person.job.toLowerCase().includes('screenplay') || person.job.toLowerCase().includes('story'))))
      .map((person) => ({ name: person.name || person.original_name || '' }))
      .filter((person) => person.name.length > 0);

    const title = raw.title || raw.name || result.title;

    return {
      title,
      originalTitle: raw.original_title || raw.original_name || undefined,
      slug: title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, ''),
      releaseYear: ensureTmdbYear(raw.release_date || raw.first_air_date),
      releaseDate: toPartialText(raw.release_date) || toPartialText(raw.first_air_date),
      runtimeMinutes: raw.runtime,
      seasonCount: raw.number_of_seasons,
      episodeCount: raw.number_of_episodes,
      episodeRuntimeMinutes: raw.episode_run_time?.[0],
      genres: (raw.genres || []).map((genre) => genre.name),
      languages: [],
      countries: [],
      directors,
      writers,
      cast,
      studios: [],
      tagline: toPartialText(raw.tagline),
      synopsis: toPartialText(raw.overview),
      posterUrl: raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : undefined,
      backdropUrl: raw.backdrop_path ? `https://image.tmdb.org/t/p/w780${raw.backdrop_path}` : undefined,
      tmdbId: raw.id,
      source: 'tmdb',
      shortDescription: toPartialText(raw.overview),
    };
  }

  if (result.source === 'OMDb' || result.source === 'IMDb ID') {
    const omdbKey = getOmdbKey();
    const response = await fetch(`https://www.omdbapi.com/?i=${encodeURIComponent(result.id)}&apikey=${omdbKey}`, {
      cache: 'no-store',
    });
    const raw = await readJson<Record<string, string>>(response, 'OMDb');

    return {
      title: raw.Title || result.title,
      originalTitle: raw.Title || result.title,
      slug: (raw.Title || result.title).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, ''),
      releaseYear: toInt(raw.Year),
      releaseDate: undefined,
      runtimeMinutes: toInt((raw.Runtime || '').replace(/\D+/g, '')),
      genres: toPartialText(raw.Genre)?.split(',').map((value) => value.trim()) || [],
      languages: toPartialText(raw.Language)?.split(',').map((value) => value.trim()) || [],
      countries: toPartialText(raw.Country)?.split(',').map((value) => value.trim()) || [],
      directors: toPartialText(raw.Director)
        ? toPartialText(raw.Director)!.split(',').map((name) => ({ name: name.trim() }))
        : [{ name: '' }],
      writers: toPartialText(raw.Writer)
        ? toPartialText(raw.Writer)!.split(',').map((name) => ({ name: name.trim() }))
        : [],
      cast: toPartialText(raw.Actors)
        ? toPartialText(raw.Actors)!.split(',').map((name, index) => ({
            name: name.trim(),
            billingOrder: index + 1,
          }))
        : [],
      studios: toPartialText(raw.Production)?.split(',').map((studio) => studio.trim()) || [],
      tagline: toPartialText(raw.Awards),
      shortDescription: toPartialText(raw.Plot),
      synopsis: toPartialText(raw.Plot),
      posterUrl: toPartialText(raw.Poster),
      imdbId: raw.imdbID || result.id,
      source: 'omdb',
      images: [],
    };
  }

  const key = String(result.payload.key || result.id).replace(/^\//, '');
  const detailResponse = await fetch(`https://openlibrary.org/${key}.json`, {
    cache: 'no-store',
  });
  const detail = await readJson<{
    title?: string;
    description?: string | { value: string };
    first_publish_date?: string;
    covers?: number[];
    first_publish_year?: number;
    subjects?: string[];
  }>(detailResponse, 'Open Library');

  const description =
    typeof detail.description === 'string'
      ? detail.description
      : detail.description?.value;

  return {
    title: detail.title || result.title,
    originalTitle: detail.title || result.title,
    slug: (detail.title || result.title).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, ''),
    releaseYear: result.year || detail.first_publish_year,
    releaseDate: detail.first_publish_date,
    shortDescription: description,
    synopsis: description,
    genres: detail.subjects?.slice(0, 8) || ['Other'],
    languages: ['en'],
    countries: [],
    directors: [],
    writers: [],
    cast: [],
    studios: [],
    posterUrl: detail.covers?.[0] ? `https://covers.openlibrary.org/b/id/${detail.covers[0]}-L.jpg` : undefined,
    source: 'openlibrary',
    images: detail.covers?.slice(0, 4).map((cover) => `https://covers.openlibrary.org/b/id/${cover}-L.jpg`) || [],
  };
}
