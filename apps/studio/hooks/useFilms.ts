'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Film, type FilmFilters } from '@/lib/types';
import { delay } from '@/lib/utils';
import * as filmStore from '@/lib/data/filmStore';

type FilmSortKey = 'title' | 'releaseYear' | 'runtimeMinutes' | 'dateAdded';

function filterFilms(films: Film[], filters: FilmFilters): Film[] {
  return films.filter((film) => {
    if (filters.search) {
      const value = filters.search.toLowerCase();
      const searchable = `${film.title} ${film.directors.map((d) => d.name).join(' ')} ${film.imdbId || ''}`.toLowerCase();
      if (!searchable.includes(value)) {
        return false;
      }
    }
    if (filters.types.length > 0 && !filters.types.includes(film.type)) {
      return false;
    }
    if (filters.genres.length > 0 && !film.genres.some((genre) => filters.genres.includes(genre))) {
      return false;
    }
    if (filters.hasPoster === true && !film.posterUrl) {
      return false;
    }
    if (filters.hasPoster === false && film.posterUrl) {
      return false;
    }
    if (filters.yearMin != null && film.releaseYear !== undefined && film.releaseYear < filters.yearMin) {
      return false;
    }
    if (filters.yearMax != null && film.releaseYear !== undefined && film.releaseYear > filters.yearMax) {
      return false;
    }
    return true;
  });
}

export function useFilms(filters: FilmFilters, page = 0, pageSize = 25, sortBy: FilmSortKey = 'dateAdded', sortDir: 'asc' | 'desc' = 'desc') {
  const query = useQuery({
    queryKey: ['films', filters, page, pageSize, sortBy, sortDir],
    queryFn: async () => {
      await delay(180);
      const all = filmStore.getFilmsAll();
      const filtered = filterFilms(all, filters);
      const sorted = [...filtered].sort((a, b) => {
        const lhs = a[sortBy];
        const rhs = b[sortBy];
        const left = (lhs as string | number | null | undefined) ?? '';
        const right = (rhs as string | number | null | undefined) ?? '';
        if (left < right) return sortDir === 'asc' ? -1 : 1;
        if (left > right) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
      return {
        items: sorted.slice(page * pageSize, page * pageSize + pageSize),
        total: filtered.length,
      };
    },
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationKey: ['films-create'],
    mutationFn: async (film: Omit<Film, 'id' | 'ulid' | 'addedAt' | 'dateAdded' | 'updatedAt'>) => {
      await delay(280);
      return filmStore.createFilm(film);
    },
    onMutate: async (newFilm) => {
      await queryClient.cancelQueries({ queryKey: ['films'] });
      const previous = queryClient.getQueryData(['films']);
      const optimistic = filmStore.createFilm(newFilm);
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['films'] });
    },
    onError: (_error, _newFilm, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['films'], context.previous);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Film> }) => {
      await delay(220);
      return filmStore.updateFilm(id, patch);
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ['films'] });
      const previous = queryClient.getQueryData(['films']);
      const film = filmStore.getFilmById(id);
      if (film) {
        const optimistic = filmStore.updateFilm(id, patch);
        queryClient.setQueryData(['film', id], optimistic);
      }
      return { previous };
    },
    onSuccess: (_film, vars) => {
      queryClient.invalidateQueries({ queryKey: ['films'] });
      queryClient.invalidateQueries({ queryKey: ['film', vars.id] });
    },
    onError: (_error, vars, context) => {
      if (vars.id && context?.previous) {
        queryClient.setQueryData(['film', vars.id], context.previous);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await delay(200);
      filmStore.deleteFilm(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['films'] });
    },
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      await delay(240);
      filmStore.bulkDeleteFilms(ids);
      return ids;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['films'] });
    },
  });

  return useMemo(
    () => ({
      ...query,
      createFilm: createMutation.mutate,
      createFilmAsync: createMutation.mutateAsync,
      createState: createMutation,
      updateFilm: updateMutation.mutate,
      updateFilmAsync: updateMutation.mutateAsync,
      updateState: updateMutation,
      deleteFilm: deleteMutation.mutate,
      deleteFilmAsync: deleteMutation.mutateAsync,
      deleteState: deleteMutation,
      bulkDelete: bulkDelete.mutate,
      bulkDeleteAsync: bulkDelete.mutateAsync,
      bulkDeleteState: bulkDelete,
      isBusy: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || bulkDelete.isPending,
    }),
    [query, createMutation, updateMutation, deleteMutation, bulkDelete],
  );
}
