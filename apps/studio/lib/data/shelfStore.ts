'use client';

import { type Shelf, type ShelfType } from '@/lib/types';
import { randomUlid, todayIso } from '@/lib/utils';

const SHELVES_KEY = '35mm-studio-shelves';

const seedShelves: Shelf[] = [
  {
    id: 'shelf-top100',
    name: 'Top 100',
    displayName: 'Top 100',
    internalName: 'top-100',
    description: 'Curated highest-rated titles from the editorial team.',
    type: 'ranked' as ShelfType,
    visibility: 'active',
    maxFilms: 100,
    refreshCadence: 'manual',
    filmIds: ['film-1', 'film-2', 'film-3', 'film-4'],
    updatedAt: todayIso(),
    createdAt: todayIso(),
  },
  {
    id: 'shelf-now',
    name: 'Now Playing',
    displayName: 'Now Playing',
    internalName: 'now-playing',
    description: 'Currently relevant across regions.',
    type: 'algorithmic-override',
    visibility: 'active',
    maxFilms: 25,
    refreshCadence: 'daily',
    filmIds: ['film-5', 'film-6', 'film-7'],
    updatedAt: todayIso(),
    createdAt: todayIso(),
  },
  {
    id: 'shelf-popular',
    name: 'Popular on 35mm',
    displayName: 'Popular on 35mm',
    internalName: 'popular-on-35mm',
    description: 'Momentum and editorials mixed.',
    type: 'editorial',
    visibility: 'draft',
    maxFilms: 50,
    refreshCadence: 'weekly',
    filmIds: ['film-8', 'film-9'],
    updatedAt: todayIso(),
    createdAt: todayIso(),
  },
];

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function ensureSeeded(): Shelf[] {
  if (!isBrowser()) {
    return seedShelves.map((shelf) => ({ ...shelf }));
  }
  const raw = window.localStorage.getItem(SHELVES_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Shelf[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }
  window.localStorage.setItem(SHELVES_KEY, JSON.stringify(seedShelves));
  return seedShelves.map((s) => ({ ...s }));
}

let shelfCache: Shelf[] = [];

function writeShelves(next: Shelf[]): void {
  shelfCache = next;
  if (isBrowser()) {
    window.localStorage.setItem(SHELVES_KEY, JSON.stringify(next));
  }
}

function hydrate(): void {
  if (shelfCache.length === 0) {
    shelfCache = ensureSeeded();
  }
}

export function getShelves(): Shelf[] {
  hydrate();
  return [...shelfCache].sort((a, b) => a.name.localeCompare(b.name));
}

export function getShelfById(id: string): Shelf | undefined {
  hydrate();
  return shelfCache.find((s) => s.id === id);
}

export function createShelf(input: Omit<Shelf, 'id' | 'updatedAt' | 'createdAt'>): Shelf {
  hydrate();
  const now = todayIso();
  const created: Shelf = {
    ...input,
    id: `shelf-${randomUlid()}`,
    updatedAt: now,
    createdAt: now,
  };
  writeShelves([created, ...shelfCache]);
  return created;
}

export function updateShelf(id: string, patch: Partial<Shelf>): Shelf {
  hydrate();
  const idx = shelfCache.findIndex((shelf) => shelf.id === id);
  if (idx === -1) {
    throw new Error('Shelf not found');
  }
  const current = shelfCache[idx];
  const nextShelf: Shelf = { ...current, ...patch, id, updatedAt: todayIso() };
  const next = [...shelfCache];
  next[idx] = nextShelf;
  writeShelves(next);
  return nextShelf;
}

export function deleteShelf(id: string): void {
  hydrate();
  const next = shelfCache.filter((s) => s.id !== id);
  if (next.length === shelfCache.length) {
    throw new Error('Shelf not found');
  }
  writeShelves(next);
}
