"use client";

import { useAuth } from "@clerk/nextjs";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/features/feed/api/http";
import { adaptPostToFeedType } from "@/features/feed/api/adapters";
import { feedKeys } from "@/features/feed/hooks/queryKeys";
import type { FeedPage } from "@/features/feed/types/feed";
import type { TitleMedia } from "@/lib/title/paths";
import { titleKeys } from "./queryKeys";

export function useTitleFilmReference(media: TitleMedia, id: string) {
  return useQuery({
    queryKey: titleKeys.filmReference(media, id),
    queryFn: async () => {
      if (/^[0-9A-HJKMNP-TV-Z]{26}$/.test(id)) return id;
      const result = await apiRequest<{ filmId: string | null }>(
        "/v1/films/tmdb/" + encodeURIComponent(id),
      );
      return result.filmId;
    },
    enabled: media === "movie",
    staleTime: 60_000,
    retry: 1,
  });
}

export function useTitleReviews(filmId: string | null) {
  const { getToken, userId, isLoaded } = useAuth();
  return useInfiniteQuery({
    queryKey: feedKeys.filmReviews(filmId, userId),
    queryFn: async ({ pageParam }): Promise<FeedPage> => {
      const query = new URLSearchParams({ limit: "12" });
      if (pageParam) query.set("cursor", pageParam);
      const result = await apiRequest<{
        items: Parameters<typeof adaptPostToFeedType>[0][];
        nextCursor: string | null;
        hasMore: boolean;
      }>(`/v1/feed/films/${encodeURIComponent(filmId!)}/reviews?${query}`, {
        token: await getToken(),
      });
      return {
        posts: result.items.map(adaptPostToFeedType),
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      };
    },
    enabled: isLoaded && Boolean(filmId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) =>
      page.hasMore ? (page.nextCursor ?? undefined) : undefined,
    staleTime: 30_000,
    retry: 1,
  });
}
