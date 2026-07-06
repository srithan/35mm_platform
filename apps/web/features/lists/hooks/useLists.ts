"use client";

import { useAuth } from "@clerk/nextjs";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addFilmToList,
  addToWatchlist,
  cloneFilmList,
  createFilmList,
  deleteFilmList,
  fetchList,
  fetchProfileLists,
  likeFilmList,
  removeFromWatchlist,
  removeListEntry,
  reorderListEntries,
  unlikeFilmList,
  updateFilmList,
  updateListEntry,
  type CatalogFilmPayload,
  type FilmListSort,
  type TmdbFilmPayload,
} from "../api/listsApi";
import { listKeys } from "./queryKeys";

export function useProfileLists(username: string, sort: FilmListSort) {
  var { getToken, isLoaded } = useAuth();

  return useInfiniteQuery({
    queryKey: listKeys.profile(username, sort),
    queryFn: async function ({ pageParam }) {
      return fetchProfileLists({
        username,
        sort,
        cursor: pageParam as string | undefined,
        token: await getToken(),
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: function (lastPage) {
      return lastPage.nextCursor ?? undefined;
    },
    enabled: isLoaded && username.trim().length > 0,
    staleTime: 30_000,
  });
}

export function useFilmList(listId: string | null) {
  var { getToken, isLoaded } = useAuth();

  return useInfiniteQuery({
    queryKey: listKeys.detail(listId ?? ""),
    queryFn: async function ({ pageParam }) {
      if (!listId) throw new Error("Missing list id");
      return fetchList(listId, { cursor: pageParam as string | undefined, token: await getToken() });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: function (lastPage) {
      return lastPage.entriesPage?.nextCursor ?? undefined;
    },
    enabled: isLoaded && Boolean(listId),
    staleTime: 30_000,
    select: function (data) {
      var first = data.pages[0]!;
      var allEntries = data.pages.flatMap(function (page) {
        return page.entries;
      });
      var last = data.pages[data.pages.length - 1];

      return {
        ...first,
        entries: allEntries,
        entriesPage: last?.entriesPage,
      };
    },
  });
}

export function useListMutations(username?: string, listId?: string | null) {
  var { getToken } = useAuth();
  var queryClient = useQueryClient();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: listKeys.all });
    if (username) queryClient.invalidateQueries({ queryKey: ["film-lists", "profile", username] });
    if (listId) queryClient.invalidateQueries({ queryKey: listKeys.detail(listId) });
  }

  return {
    createList: useMutation({
      mutationFn: async function (input: {
        title: string;
        description?: string | null;
        visibility: "public" | "private";
        isRanked: boolean;
        tags: string[];
      }) {
        return createFilmList(input, await getToken());
      },
      onSuccess: invalidate,
    }),
    updateList: useMutation({
      mutationFn: async function (input: {
        id: string;
        patch: Partial<{
          title: string;
          description: string | null;
          visibility: "public" | "private";
          isRanked: boolean;
          tags: string[];
        }>;
      }) {
        return updateFilmList(input.id, input.patch, await getToken());
      },
      onSuccess: invalidate,
    }),
    deleteList: useMutation({
      mutationFn: async function (id: string) {
        return deleteFilmList(id, await getToken());
      },
      onSuccess: invalidate,
    }),
    addEntry: useMutation({
      mutationFn: async function (input: { id: string; film: TmdbFilmPayload; note?: string | null }) {
        return addFilmToList(input.id, { film: input.film, note: input.note ?? null }, await getToken());
      },
      onSuccess: invalidate,
    }),
    updateEntry: useMutation({
      mutationFn: async function (input: { id: string; entryId: string; note?: string | null; position?: number | null }) {
        return updateListEntry(input.id, input.entryId, { note: input.note, position: input.position }, await getToken());
      },
      onSuccess: invalidate,
    }),
    removeEntry: useMutation({
      mutationFn: async function (input: { id: string; entryId: string }) {
        return removeListEntry(input.id, input.entryId, await getToken());
      },
      onSuccess: invalidate,
    }),
    reorderEntries: useMutation({
      mutationFn: async function (input: { id: string; entries: Array<{ entryId: string; position: number }> }) {
        return reorderListEntries(input.id, input.entries, await getToken());
      },
      onSuccess: invalidate,
    }),
    toggleLike: useMutation({
      mutationFn: async function (input: { id: string; isLiked: boolean }) {
        if (input.isLiked) {
          return unlikeFilmList(input.id, await getToken());
        }
        return likeFilmList(input.id, await getToken());
      },
      onSuccess: invalidate,
    }),
    cloneList: useMutation({
      mutationFn: async function (input: { id: string; title?: string; visibility?: "public" | "private" }) {
        return cloneFilmList(input.id, { title: input.title, visibility: input.visibility }, await getToken());
      },
      onSuccess: invalidate,
    }),
  };
}

export function useWatchlistMutation() {
  var { getToken, isSignedIn } = useAuth();
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (input: {
      film?: TmdbFilmPayload;
      catalogFilm?: CatalogFilmPayload;
      filmId?: string;
      inWatchlist?: boolean;
    }) {
      if (!isSignedIn) throw new Error("Sign in to use your watchlist");
      if (input.inWatchlist) {
        if (input.filmId) {
          await removeFromWatchlist(input.filmId, await getToken());
        }
        return { isInWatchlist: false };
      }
      return addToWatchlist(
        { film: input.film, catalogFilm: input.catalogFilm, filmId: input.filmId },
        await getToken()
      );
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: listKeys.all });
    },
  });
}
