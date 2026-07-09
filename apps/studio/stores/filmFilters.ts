import { create } from 'zustand';
import { type FilmType } from '@/lib/types';

interface FilmFiltersState {
  search: string;
  type: FilmType | null;
  year: number | null;
  viewMode: 'table' | 'grid';
  globalSearch: string;
  selectedIds: string[];
  setSearch: (search: string) => void;
  setType: (type: FilmType | null) => void;
  setYear: (year: number | null) => void;
  setViewMode: (mode: 'table' | 'grid') => void;
  setGlobalSearch: (value: string) => void;
  setSelectedIds: (ids: string[]) => void;
}

export const useFilmFilters = create<FilmFiltersState>((set) => ({
  search: '',
  type: null,
  year: null,
  viewMode: 'table',
  globalSearch: '',
  selectedIds: [],
  setSearch: (search) => set({ search }),
  setType: (type) => set({ type }),
  setYear: (year) => set({ year }),
  setViewMode: (viewMode) => set({ viewMode }),
  setGlobalSearch: (globalSearch) => set({ globalSearch }),
  setSelectedIds: (selectedIds) => set({ selectedIds }),
}));
