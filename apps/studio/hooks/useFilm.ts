'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { type Film } from '@/lib/types';
import { delay } from '@/lib/utils';
import * as filmStore from '@/lib/data/filmStore';

export function useFilm(id: string | null) {
  const query = useQuery({
    queryKey: ['film', id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) {
        return null;
      }
      await delay(170);
      return filmStore.getFilmById(id) ?? null;
    },
  });

  const queryClient = useQueryClient();

  const [deleted, setDeleted] = useState(false);

  const deleteFilm = useMutation({
    mutationFn: async (targetId: string) => {
      await delay(180);
      filmStore.deleteFilm(targetId);
      return targetId;
    },
    onSuccess: (targetId) => {
      queryClient.invalidateQueries({ queryKey: ['films'] });
      queryClient.setQueryData(['film', targetId], null);
      setDeleted(true);
    },
  });

  return {
    ...query,
    deleteFilm: (targetId: string) => deleteFilm.mutate(targetId),
    isDeleting: deleteFilm.isPending,
    deleteError: deleteFilm.error,
    deleted,
  };
}
