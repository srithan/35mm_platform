"use client";

import { useAuth } from "@clerk/nextjs";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/features/auth/hooks/queryKeys";
import { feedKeys } from "@/features/feed/hooks/queryKeys";
import { privacyKeys } from "@/features/settings/hooks/queryKeys";
import { bookmarkKeys } from "@/features/bookmarks/hooks/queryKeys";
import {
  fetchPublicProfile,
  followUser,
  fetchProfileFollowRequests,
  blockUser,
  muteUser,
  unblockUser,
  unmuteUser,
  unfollowUser,
  updateCurrentProfile,
  type CurrentProfilePatch,
  type PublicProfile,
} from "../api/profileApi";
import { profileKeys } from "./queryKeys";

export function usePublicProfile(username: string) {
  var { getToken, isLoaded } = useAuth();

  return useQuery({
    queryKey: profileKeys.detail(username),
    queryFn: async () => fetchPublicProfile(username, await getToken()),
    enabled: isLoaded && username.trim().length > 0,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
  });
}

export function useFollowToggle(username: string) {
  var queryClient = useQueryClient();
  var { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (input: {
      userId: string;
      isFollowing: boolean;
      isFollowRequested?: boolean;
    }) {
      var token = await getToken();
      if (input.isFollowing || input.isFollowRequested) {
        await unfollowUser(input.userId, token);
        return { mode: "unfollow" as const, isFollowing: false, isFollowRequested: false };
      } else {
        var result = await followUser(input.userId, token);
        return {
          mode:
            result.status === "pending" ? "request" as const : "follow" as const,
          isFollowing: result.isFollowing,
          isFollowRequested: result.status === "pending",
        };
      }
    },
    onMutate: async function (input) {
      await queryClient.cancelQueries({ queryKey: profileKeys.detail(username) });

      var previous = queryClient.getQueryData<PublicProfile | null>(
        profileKeys.detail(username)
      );

      if (previous) {
        var isToggleOff = input.isFollowing || input.isFollowRequested;
        var optimisticIsFollowing = isToggleOff ? false : previous.isPrivate ? false : true;
        var optimisticIsRequested = isToggleOff ? false : previous.isPrivate;
        var followerCountDelta =
          Number(optimisticIsFollowing) - Number(previous.isFollowing);
        var nextFollowerCount = Math.max(0, previous.followerCount + followerCountDelta);

        queryClient.setQueryData<PublicProfile>(profileKeys.detail(username), {
          ...previous,
          isFollowing: optimisticIsFollowing,
          isFollowRequested: optimisticIsRequested,
          followerCount: nextFollowerCount,
        });
      }

      return { previous };
    },
    onSuccess: async function (result, _input, context) {
      var current = queryClient.getQueryData<PublicProfile | null>(
        profileKeys.detail(username)
      );
      if (!current) return;
      if (!context?.previous) {
        queryClient.setQueryData<PublicProfile>(profileKeys.detail(username), {
          ...current,
          isFollowing: result.isFollowing,
          isFollowRequested: result.isFollowRequested,
        });
        return;
      }
      var previous = context.previous;
      var nextIsFollowing = result.isFollowing;
      var nextIsFollowRequested = result.isFollowRequested;

      if (result.mode === "request") {
        nextIsFollowing = false;
        nextIsFollowRequested = true;
      } else if (result.mode === "unfollow") {
        nextIsFollowing = false;
        nextIsFollowRequested = false;
      }

      queryClient.setQueryData<PublicProfile>(profileKeys.detail(username), {
        ...previous,
        isFollowing: nextIsFollowing,
        isFollowRequested: nextIsFollowRequested,
      });
    },
    onError: function (_err, _vars, context) {
      if (context?.previous) {
        queryClient.setQueryData(profileKeys.detail(username), context.previous);
      }
    },
    onSettled: function () {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(username) });
    },
  });
}

export function useIncomingFollowRequests(username: string) {
  var { getToken, isLoaded } = useAuth();

  return useInfiniteQuery({
    queryKey: profileKeys.followRequests(username),
    queryFn: async function ({ pageParam }) {
      return fetchProfileFollowRequests({
        username,
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
    gcTime: 5 * 60_000,
  });
}

export function useUpdateProfileMutation() {
  var queryClient = useQueryClient();
  var { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (input: Partial<CurrentProfilePatch>) {
      return updateCurrentProfile(input, await getToken());
    },
    onSuccess: function (next) {
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      queryClient.setQueriesData<PublicProfile | null>(
        { queryKey: profileKeys.all },
        function (existing) {
          if (!existing) return existing;
          if (existing.username !== next.username) return existing;
          return {
            ...existing,
            username: next.username,
            displayName: next.displayName,
            bio: next.bio,
            avatarUrl: next.avatarUrl,
            coverUrl: next.coverUrl,
            location: next.location,
            website: next.website,
            dateOfBirth: next.dateOfBirth,
            role: next.role,
            roleContext: next.roleContext,
          };
        }
      );
    },
  });
}

export function useBlockUserMutation() {
  var queryClient = useQueryClient();
  var { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (input: { userId: string; blocked: boolean }) {
      var token = await getToken();
      if (input.blocked) {
        await unblockUser(input.userId, token);
      } else {
        await blockUser(input.userId, token);
      }
    },
    onSuccess: function (_data, input) {
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      queryClient.invalidateQueries({ queryKey: privacyKeys.blocks() });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
      if (!input.blocked) {
        queryClient.invalidateQueries({ queryKey: privacyKeys.mutes() });
      }
    },
  });
}

export function useMuteUserMutation() {
  var queryClient = useQueryClient();
  var { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (input: { userId: string; muted: boolean }) {
      var token = await getToken();
      if (input.muted) {
        await unmuteUser(input.userId, token);
      } else {
        await muteUser(input.userId, token);
      }
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      queryClient.invalidateQueries({ queryKey: privacyKeys.mutes() });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
    },
  });
}
