'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { type Shelf } from '@/lib/types';
import { delay } from '@/lib/utils';
import * as shelfStore from '@/lib/data/shelfStore';

export function useShelvesQuery() {
  const client = useQueryClient();

  const query = useQuery({
    queryKey: ['shelves'],
    queryFn: async () => {
      await delay(180);
      return shelfStore.getShelves();
    },
  });

  const createShelf = useMutation({
    mutationFn: async (input: Omit<Shelf, 'id' | 'createdAt' | 'updatedAt'>) => {
      await delay(200);
      return shelfStore.createShelf(input);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['shelves'] });
    },
  });

  const updateShelf = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Shelf> }) => {
      await delay(200);
      return shelfStore.updateShelf(id, patch);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['shelves'] });
    },
  });

  const deleteShelf = useMutation({
    mutationFn: async (id: string) => {
      await delay(150);
      shelfStore.deleteShelf(id);
      return id;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['shelves'] });
    },
  });

  return useMemo(
    () => ({
      ...query,
      createShelf: createShelf.mutate,
      createShelfAsync: createShelf.mutateAsync,
      createState: createShelf,
      updateShelf: updateShelf.mutate,
      updateShelfAsync: updateShelf.mutateAsync,
      updateState: updateShelf,
      deleteShelf: deleteShelf.mutate,
      deleteShelfAsync: deleteShelf.mutateAsync,
      deleteState: deleteShelf,
      isBusy: createShelf.isPending || updateShelf.isPending || deleteShelf.isPending,
    }),
    [query, createShelf, updateShelf, deleteShelf],
  );
}

export function useShelf(id: string | null) {
  return useQuery({
    queryKey: ['shelf', id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) {
        return null;
      }
      await delay(130);
      return shelfStore.getShelfById(id) ?? null;
    },
  });
}
