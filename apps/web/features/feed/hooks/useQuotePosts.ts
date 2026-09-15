import { useAuth } from "@clerk/nextjs";
import { useInfiniteQuery } from "@tanstack/react-query";
import { shouldRetryApiRead } from "../api/http";
import { fetchQuotePosts, type QuotePostSort } from "../api/feedApi";
import { feedKeys } from "./queryKeys";

export function useQuotePosts(postId: string | undefined, sort: QuotePostSort, enabled = true) {
  const { getToken, isLoaded } = useAuth();

  return useInfiniteQuery({
    queryKey: feedKeys.quotes(postId ?? "unknown", sort),
    queryFn: async function ({ pageParam }) {
      if (!postId) throw new Error("Post ID is required");
      return fetchQuotePosts({
        postId,
        sort,
        cursor: pageParam as string | undefined,
        token: await getToken(),
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isLoaded && enabled && Boolean(postId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: shouldRetryApiRead,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}
