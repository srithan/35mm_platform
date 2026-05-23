import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchFeed } from "../api/feedApi";
import { feedKeys } from "./queryKeys";

export function useFeed() {
  return useInfiniteQuery({
    queryKey: feedKeys.home,
    queryFn: ({ pageParam }) =>
      fetchFeed({ cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}
