'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { listModerationQueue, type ModerationQueueFilters } from '@/lib/moderation/api';

export function useModerationQueue(
  filters: ModerationQueueFilters,
  cursor: string | null,
  limit: number,
) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['moderation', 'queue', filters, cursor, limit],
    queryFn: async () => listModerationQueue(filters, cursor, limit, await getToken()),
    staleTime: 15_000,
  });
}
