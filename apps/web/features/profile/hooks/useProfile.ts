"use client";

import { useAuth } from "@clerk/nextjs";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/features/auth/hooks/queryKeys";
import { feedKeys } from "@/features/feed/hooks/queryKeys";
import { privacyKeys } from "@/features/settings/hooks/queryKeys";
import { bookmarkKeys } from "@/features/bookmarks/hooks/queryKeys";
import {
  fetchPublicProfile,
  fetchProfileStats,
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
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

export function useProfileStats(username: string) {
  var { getToken, isLoaded } = useAuth();

  return useQuery({
    queryKey: profileKeys.stats(username),
    queryFn: async function () {
      return fetchProfileStats(username, await getToken());
    },
    enabled: isLoaded && username.trim().length > 0,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

export function useFollowToggle(username: string) {
  var queryClient = useQueryClient();
  var { getToken } = useAuth();

	  return useMutation({
	    mutationFn: async function (input: {
	      userId: string;
	      followState: PublicProfile["followState"];
	    }) {
	      var token = await getToken();
	      if (input.followState === "following" || input.followState === "requested") {
	        await unfollowUser(input.userId, token);
	        return { mode: "unfollow" as const, followState: "none" as const };
	      } else {
	        var result = await followUser(input.userId, token);
	        return {
	          mode:
	            result.status === "pending" ? "request" as const : "follow" as const,
	          followState: result.status === "pending" ? "requested" as const : "following" as const,
	        };
	      }
	    },
    onMutate: async function (input) {
      await queryClient.cancelQueries({ queryKey: profileKeys.detail(username) });

      var previous = queryClient.getQueryData<PublicProfile | null>(
        profileKeys.detail(username)
	      );

	      if (previous) {
	        var isToggleOff = input.followState === "following" || input.followState === "requested";
	        var optimisticFollowState: PublicProfile["followState"] = isToggleOff
	          ? "none"
	          : previous.isPrivate
	            ? "requested"
	            : "following";
	        var followerCountDelta =
	          Number(optimisticFollowState === "following") - Number(previous.followState === "following");
	        var nextFollowerCount = Math.max(0, previous.followerCount + followerCountDelta);

	        queryClient.setQueryData<PublicProfile>(profileKeys.detail(username), {
	          ...previous,
	          followState: optimisticFollowState,
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
	          followState: result.followState,
	        });
	        return;
	      }
	      var previous = context.previous;
	      var nextFollowState = result.followState;

	      if (result.mode === "request") {
	        nextFollowState = "requested";
	      } else if (result.mode === "unfollow") {
	        nextFollowState = "none";
	      }

	      queryClient.setQueryData<PublicProfile>(profileKeys.detail(username), {
	        ...previous,
	        followState: nextFollowState,
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
