import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  fetchCommunities,
  fetchCommunityBySlug,
  fetchCommunityFeed,
} from "../api/communitiesApi";
import { communityKeys } from "./queryKeys";

export function useCommunities() {
  return useInfiniteQuery({
    queryKey: communityKeys.list(),
    queryFn: ({ pageParam }) =>
      fetchCommunities({ cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}

export function useCommunity(slug: string) {
  return useQuery({
    queryKey: communityKeys.detail(slug),
    queryFn: () => fetchCommunityBySlug(slug),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    enabled: Boolean(slug),
    retry: 1,
  });
}

export function useCommunityFeed(slug: string) {
  return useInfiniteQuery({
    queryKey: communityKeys.feed(slug),
    queryFn: ({ pageParam }) =>
      fetchCommunityFeed({ slug, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    enabled: Boolean(slug),
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}
