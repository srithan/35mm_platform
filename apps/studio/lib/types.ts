import type {
  CatalogEntityStatus,
  CatalogExternalIdRow,
  CatalogMediaRow,
  CatalogTitleType,
} from '@35mm/types';

export const FILM_TYPES = [
  'movie',
  'short_film',
  'documentary',
  'tv_series',
  'web_series',
  'tv_season',
  'tv_episode',
  'tv_special',
  'video',
  'other',
] as const satisfies readonly CatalogTitleType[];

export const FILM_STATUS = [
  'active',
  'merged',
  'deleted',
  'locked',
] as const satisfies readonly CatalogEntityStatus[];

export const FILM_LIFECYCLES = [
  'released',
  'unknown',
  'announced',
  'in_production',
  'ended',
  'canceled',
] as const;

export const CONTENT_WARNINGS = [
  'violence',
  'sexual content',
  'flashing lights',
  'substance use',
  'animal harm',
  'child endangerment',
  'suicide/self-harm',
] as const;

export const SHELF_TYPES = ['ranked', 'editorial', 'algorithmic-override'] as const;
export const SHELF_VISIBILITY = ['active', 'draft'] as const;
export const SHELF_CADENCE = ['manual', 'daily', 'weekly'] as const;

export type FilmType = (typeof FILM_TYPES)[number];
export type FilmStatus = (typeof FILM_STATUS)[number];
export type FilmLifecycle = (typeof FILM_LIFECYCLES)[number];
export type ContentWarning = (typeof CONTENT_WARNINGS)[number];
export type ShelfType = (typeof SHELF_TYPES)[number];
export type ShelfVisibility = (typeof SHELF_VISIBILITY)[number];
export type ShelfCadence = (typeof SHELF_CADENCE)[number];

export type SortDirection = 'asc' | 'desc';

export interface FilmPerson {
  name: string;
  personId?: string;
  character?: string;
  billingOrder?: number;
}

export interface Film {
  id: string;
  title: string;
  originalTitle?: string | null;
  sortTitle: string;
  slug: string;
  type: FilmType;
  status: FilmStatus;
  lifecycle: FilmLifecycle;
  imdbId?: string | null;
  tmdbId?: string | null;
  posterUrl?: string;
  releaseYear?: number;
  endYear?: number | null;
  releaseDate?: string | null;
  runtimeMinutes?: number | null;
  primaryLanguage?: string | null;
  primaryCountry?: string | null;
  languages: string[];
  countries: string[];
  genres: string[];
  contentWarnings: string[];
  directors: FilmPerson[];
  writers: FilmPerson[];
  cast: FilmPerson[];
  synopsis?: string | null;
  facts: Record<string, unknown>;
  isAdult: boolean;
  isVerified: boolean;
  primaryMedia: CatalogMediaRow | null;
  externalIds: CatalogExternalIdRow[];
  dateAdded: string;
  updatedAt: string;
  createdAt: string;
}

export interface ShelfEntry {
  filmId: string;
  position: number;
}

export interface Shelf {
  id: string;
  name: string;
  displayName: string;
  internalName: string;
  description?: string;
  type: ShelfType;
  visibility: ShelfVisibility;
  maxFilms: number;
  refreshCadence: ShelfCadence;
  filmIds: string[];
  updatedAt: string;
  createdAt: string;
}

export interface FilmFilters {
  search: string;
  type: FilmType | null;
  year: number | null;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
