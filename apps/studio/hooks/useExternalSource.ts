'use client';

import { useMutation } from '@tanstack/react-query';
import * as external from '@/lib/data/externalSource';

export function useExternalSearch() {
  return useMutation({
    mutationFn: async (args: { source: external.ExternalSourceName; query: string }) => {
      return external.searchExternalFilms(args.query, args.source);
    },
  });
}

export function useExternalDetails() {
  return useMutation({
    mutationFn: async (result: external.ExternalSearchResult) => {
      return external.fetchExternalDetails(result);
    },
  });
}
