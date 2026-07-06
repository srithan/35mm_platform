'use client';

import { type Film, type FilmType } from '@/lib/types';
import { randomUlid, todayIso } from '@/lib/utils';
import { seededFilms } from '@/lib/data/seedFilms';

const FILMS_KEY = '35mm-studio-films';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function sortByDateDesc(a: Film, b: Film): number {
  return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
}

function ensureSeeded(): Film[] {
  if (!isBrowser()) {
    return seededFilms.map((film) => ({ ...film }));
  }

  const raw = window.localStorage.getItem(FILMS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Film[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // ignore corrupted localStorage and reseed
    }
  }

  const seed = seededFilms.map((film) => ({
    ...film,
    id: film.id,
    ulid: film.ulid || randomUlid(),
    addedAt: film.addedAt || todayIso(),
    dateAdded: film.dateAdded || todayIso(),
    updatedAt: film.updatedAt || todayIso(),
  }));
  window.localStorage.setItem(FILMS_KEY, JSON.stringify(seed));
  return seed;
}

let filmsCache: Film[] = [];

function writeFilms(next: Film[]): void {
  filmsCache = next;
  if (isBrowser()) {
    window.localStorage.setItem(FILMS_KEY, JSON.stringify(next));
  }
}

function hydrate(): void {
  if (filmsCache.length === 0) {
    filmsCache = ensureSeeded();
  }
}

export function getFilmsAll(): Film[] {
  hydrate();
  return [...filmsCache].sort(sortByDateDesc);
}

export function getFilmById(id: string): Film | undefined {
  hydrate();
  return filmsCache.find((f) => f.id === id);
}

export function createFilm(input: Omit<Film, 'id' | 'ulid' | 'addedAt' | 'dateAdded' | 'updatedAt'>): Film {
  hydrate();
  const created: Film = {
    ...input,
    id: `film-${randomUlid()}`,
    ulid: randomUlid(),
    addedAt: todayIso(),
    dateAdded: todayIso(),
    updatedAt: todayIso(),
  };
  writeFilms([created, ...filmsCache]);
  return created;
}

export function updateFilm(id: string, patch: Partial<Film>): Film {
  hydrate();
  const idx = filmsCache.findIndex((film) => film.id === id);
  if (idx === -1) {
    throw new Error('Film not found');
  }
  const current = filmsCache[idx];
  const updated: Film = {
    ...current,
    ...patch,
    id,
    updatedAt: todayIso(),
  };
  const next = [...filmsCache];
  next[idx] = updated;
  writeFilms(next);
  return updated;
}

export function deleteFilm(id: string): void {
  hydrate();
  const next = filmsCache.filter((film) => film.id !== id);
  if (next.length === filmsCache.length) {
    throw new Error('Film not found');
  }
  writeFilms(next);
}

export function bulkDeleteFilms(ids: string[]): void {
  hydrate();
  const set = new Set(ids);
  writeFilms(filmsCache.filter((film) => !set.has(film.id)));
}

export function bulkUpsertFilms(items: Film[]): void {
  hydrate();
  const map = new Map(filmsCache.map((film) => [film.id, film]));
  items.forEach((film) => {
    if (map.has(film.id)) {
      map.set(film.id, { ...map.get(film.id)!, ...film, updatedAt: todayIso() });
    } else {
      map.set(film.id, {
        ...film,
        updatedAt: todayIso(),
        addedAt: film.addedAt || todayIso(),
        dateAdded: film.dateAdded || film.addedAt || todayIso(),
      });
    }
  });
  writeFilms(Array.from(map.values()).sort(sortByDateDesc));
}

export function clearCacheForTest(): void {
  filmsCache = [];
  if (isBrowser()) {
    window.localStorage.removeItem(FILMS_KEY);
  }
}
