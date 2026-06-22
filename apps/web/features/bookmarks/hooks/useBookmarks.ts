"use client";

import { useAuth } from "@clerk/nextjs";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchBookmarks } from "../api/bookmarksApi";
import { bookmarkKeys } from "./queryKeys";

export function useBookmarks(folderId?: string | null) {
  var { getToken, isLoaded, isSignedIn } = useAuth();

  return useInfiniteQuery({
    queryKey: bookmarkKeys.list(folderId),
    queryFn: async function ({ pageParam }) {
      return fetchBookmarks({
        cursor: pageParam as string | undefined,
        folderId,
        token: await getToken(),
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: function (lastPage) {
      return lastPage.nextCursor ?? undefined;
    },
    enabled: isLoaded && Boolean(isSignedIn),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}
