"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { fetchBookmarkFolders } from "../api/bookmarksApi";
import { bookmarkKeys } from "./queryKeys";

export function useBookmarkFolders(options?: { enabled?: boolean }) {
  var { getToken, isLoaded, isSignedIn } = useAuth();
  var enabled = options?.enabled !== false && isLoaded && Boolean(isSignedIn);

  return useQuery({
    queryKey: bookmarkKeys.folders(),
    queryFn: async function () {
      return fetchBookmarkFolders(await getToken());
    },
    enabled: enabled,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}
