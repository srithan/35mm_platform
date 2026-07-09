'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteCatalogFilm, getCatalogFilm } from '@/lib/catalog/api';

export function useFilm(id: string | null) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const [deleted, setDeleted] = useState(false);

  const query = useQuery({
    queryKey: ['catalog', 'titles', id],
    enabled: Boolean(id),
    queryFn: () => {
      if (!id) return null;
      return getCatalogFilm(id);
    },
    staleTime: 30_000,
  });

  const deleteFilm = useMutation({
    mutationFn: async (targetId: string) => deleteCatalogFilm(targetId, { token: await getToken() }),
    onSuccess: (targetId) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'titles'] });
      queryClient.setQueryData(['catalog', 'titles', targetId], null);
      setDeleted(true);
    },
  });

  return {
    ...query,
    deleteFilm: (targetId: string) => deleteFilm.mutate(targetId),
    deleteFilmAsync: deleteFilm.mutateAsync,
    isDeleting: deleteFilm.isPending,
    deleteError: deleteFilm.error,
    deleted,
  };
}
