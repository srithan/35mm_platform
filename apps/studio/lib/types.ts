export const FILM_TYPES = [
  'feature',
  'short',
  'documentary',
  'tv-show',
  'web-series',
  'mini-series',
  'special',
  'anthology',
] as const;

export const FILM_STATUS = [
  'released',
  'in-production',
  'post-production',
  'announced',
  'cancelled',
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
export type ContentWarning = (typeof CONTENT_WARNINGS)[number];
export type ShelfType = (typeof SHELF_TYPES)[number];
export type ShelfVisibility = (typeof SHELF_VISIBILITY)[number];
export type ShelfCadence = (typeof SHELF_CADENCE)[number];

export type FilmSource = 'tmdb' | 'omdb' | 'imdb' | 'openlibrary' | 'manual';

export type SortDirection = 'asc' | 'desc';

export interface FilmPerson {
  name: string;
  personId?: string;
  character?: string;
  billingOrder?: number;
}

export interface Film {
  id: string;
  ulid: string;
  title: string;
  originalTitle?: string;
  slug: string;
  type: FilmType;
  status: FilmStatus;
  source: FilmSource;
  imdbId?: string;
  tmdbId?: number;
  posterUrl?: string;
  backdropUrl?: string;
  releaseYear?: number;
  releaseDate?: string;
  runtimeMinutes?: number;
  seasonCount?: number;
  episodeCount?: number;
  episodeRuntimeMinutes?: number;
  languages: string[];
  countries: string[];
  genres: string[];
  directors: FilmPerson[];
  writers: FilmPerson[];
  cast: FilmPerson[];
  studios: string[];
  tagline?: string;
  shortDescription?: string;
  synopsis?: string;
  trailerUrl?: string;
  images: string[];
  tags: string[];
  contentWarnings: ContentWarning[];
  isShortFilm: boolean;
  featured: boolean;
  adminNotes?: string;
  addedAt: string;
  dateAdded: string;
  updatedAt: string;
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
  types: FilmType[];
  genres: string[];
  yearMin?: number | null;
  yearMax?: number | null;
  hasPoster: boolean | null;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}
