import { useAuth } from "@clerk/nextjs";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchFeed } from "../api/feedApi";
import { feedKeys } from "./queryKeys";

export function useFeed(username?: string) {
  const { getToken, isLoaded } = useAuth();

  return useInfiniteQuery({
    queryKey: username ? feedKeys.profile(username) : feedKeys.home(),
    queryFn: async ({ pageParam }) =>
      fetchFeed({
        cursor: pageParam as string | undefined,
        username,
        token: await getToken(),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isLoaded,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}
