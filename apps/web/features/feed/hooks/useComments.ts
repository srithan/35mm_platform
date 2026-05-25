import { useAuth } from "@clerk/nextjs";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchComments } from "../api/commentsApi";
import { feedKeys } from "./queryKeys";

export function useComments(postId: string) {
  var { getToken, isLoaded } = useAuth();

  return useInfiniteQuery({
    queryKey: feedKeys.comments(postId),
    queryFn: async function ({ pageParam }) {
      return fetchComments({
        postId,
        cursor: pageParam as string | undefined,
        token: await getToken(),
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: function (lastPage) {
      return lastPage.nextCursor ?? undefined;
    },
    staleTime: 30_000,
    enabled: isLoaded && Boolean(postId),
  });
}
