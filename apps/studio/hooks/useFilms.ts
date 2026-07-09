'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Film, FilmFilters } from '@/lib/types';
import type { FilmFormValues } from '@/lib/schemas';
import {
  createCatalogFilm,
  deleteCatalogFilm,
  listCatalogFilms,
  updateCatalogFilm,
} from '@/lib/catalog/api';

export function useFilms(
  filters: FilmFilters,
  cursor: string | null = null,
  pageSize = 25,
) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const query = useQuery({
    queryKey: ['catalog', 'titles', filters, cursor, pageSize],
    queryFn: () => listCatalogFilms(filters, cursor, pageSize),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationKey: ['catalog', 'titles', 'create'],
    mutationFn: async (values: FilmFormValues) => createCatalogFilm(values, { token: await getToken() }),
    onSuccess: (film) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'titles'] });
      queryClient.setQueryData(['catalog', 'titles', film.id], film);
    },
  });

  const updateMutation = useMutation({
    mutationKey: ['catalog', 'titles', 'update'],
    mutationFn: async ({ current, values }: { current: Film; values: FilmFormValues }) =>
      updateCatalogFilm(current, values, { token: await getToken() }),
    onSuccess: (film) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'titles'] });
      queryClient.setQueryData(['catalog', 'titles', film.id], film);
    },
  });

  const deleteMutation = useMutation({
    mutationKey: ['catalog', 'titles', 'delete'],
    mutationFn: async (id: string) => deleteCatalogFilm(id, { token: await getToken() }),
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'titles'] });
      queryClient.setQueryData(['catalog', 'titles', id], null);
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
      isBusy: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    }),
    [query, createMutation, updateMutation, deleteMutation],
  );
}
