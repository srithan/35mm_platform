import { create } from 'zustand';
import { type FilmType } from '@/lib/types';

interface FilmFiltersState {
  search: string;
  types: FilmType[];
  genres: string[];
  yearMin: number | null;
  yearMax: number | null;
  hasPoster: boolean | null;
  viewMode: 'table' | 'grid';
  globalSearch: string;
  selectedIds: string[];
  setSearch: (search: string) => void;
  setTypes: (types: FilmType[]) => void;
  setGenres: (genres: string[]) => void;
  setYearRange: (min: number | null, max: number | null) => void;
  setHasPoster: (hasPoster: boolean | null) => void;
  setViewMode: (mode: 'table' | 'grid') => void;
  setGlobalSearch: (value: string) => void;
  setSelectedIds: (ids: string[]) => void;
}

export const useFilmFilters = create<FilmFiltersState>((set) => ({
  search: '',
  types: [],
  genres: [],
  yearMin: null,
  yearMax: null,
  hasPoster: null,
  viewMode: 'table',
  globalSearch: '',
  selectedIds: [],
  setSearch: (search) => set({ search }),
  setTypes: (types) => set({ types }),
  setGenres: (genres) => set({ genres }),
  setYearRange: (yearMin, yearMax) => set({ yearMin, yearMax }),
  setHasPoster: (hasPoster) => set({ hasPoster }),
  setViewMode: (viewMode) => set({ viewMode }),
  setGlobalSearch: (globalSearch) => set({ globalSearch }),
  setSelectedIds: (selectedIds) => set({ selectedIds }),
}));
