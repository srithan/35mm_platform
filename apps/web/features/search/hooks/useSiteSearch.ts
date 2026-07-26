"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import type { SiteSearchResponse } from "@35mm/types";
import { fetchSiteSearch } from "../api/siteSearchApi";
import { siteSearchKeys } from "./queryKeys";

const EMPTY_RESPONSE: SiteSearchResponse = {
  items: [],
  nextCursor: null,
  hasMore: false,
};

export function useSiteSearch(query: string, limit = 5) {
  var { getToken, isLoaded, userId } = useAuth();
  var normalizedQuery = query.trim();
  return useQuery({
    queryKey: siteSearchKeys.query(normalizedQuery, limit),
    queryFn: async function () {
      return fetchSiteSearch(normalizedQuery, await getToken(), limit);
    },
    enabled: isLoaded && Boolean(userId) && normalizedQuery.length >= 2,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    placeholderData: EMPTY_RESPONSE,
  });
}
