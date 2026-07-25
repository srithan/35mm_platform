import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/features/auth/hooks/queryKeys";
import {
  followUser,
  unfollowUser,
  type CurrentUserProfile,
  type PublicProfile,
} from "@/features/profile/api/profileApi";
import { profileKeys } from "@/features/profile/hooks/queryKeys";
import type { SuggestionsResponse } from "@35mm/types";
import { fetchPeopleSuggestions } from "../api/suggestionsApi";
import { suggestionsKeys } from "./queryKeys";

type SuggestionListParams = {
  limit?: number;
  cursor?: string;
};

export type SuggestionsFollowPayload = {
  userId: string;
  username: string;
  followState: SuggestionFollowState;
};

export type SuggestionFollowState = "none" | "following" | "requested";

export type SuggestionFollowResult = {
  previousState: SuggestionFollowState;
  nextState: SuggestionFollowState;
  counterDelta: -1 | 0 | 1;
};

export function usePeopleSuggestions(params: SuggestionListParams = {}) {
  var limit = params.limit ?? 20;
  var cursor = params.cursor;

  var { getToken, isLoaded, isSignedIn } = useAuth();

  return useQuery<SuggestionsResponse>({
    queryKey: suggestionsKeys.list(limit, cursor ?? null),
    queryFn: async function () {
      return fetchPeopleSuggestions(await getToken(), {
        limit,
        cursor,
      });
    },
    enabled: isLoaded && Boolean(isSignedIn),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useSuggestionFollowMutation() {
  var { getToken } = useAuth();
  var queryClient = useQueryClient();

  return useMutation<SuggestionFollowResult, Error, SuggestionsFollowPayload>({
    mutationFn: async function (input) {
      var token = await getToken();
      if (input.followState !== "none") {
        await unfollowUser(input.userId, token);
        return {
          previousState: input.followState,
          nextState: "none",
          counterDelta: input.followState === "following" ? -1 : 0,
        };
      }

      var result = await followUser(input.userId, token);
      return {
        previousState: "none",
        nextState: result.status === "pending" ? "requested" : "following",
        counterDelta: result.status === "accepted" && result.created ? 1 : 0,
      };
    },
    onSuccess: function (result, input) {
      var currentUser = queryClient.getQueryData<CurrentUserProfile>(authKeys.me());

      if (result.counterDelta !== 0) {
        queryClient.setQueryData<CurrentUserProfile>(authKeys.me(), function (existing) {
          if (!existing) return existing;
          return {
            ...existing,
            followingCount: Math.max(0, existing.followingCount + result.counterDelta),
          };
        });
      }

      queryClient.setQueriesData<PublicProfile | null>(
        { queryKey: profileKeys.details() },
        function (existing) {
          if (!existing) return existing;
          var next = existing;

          if (existing.userId === input.userId) {
            next = {
              ...next,
              followState: result.nextState,
              followerCount: Math.max(0, next.followerCount + result.counterDelta),
            };
          }

          if (
            result.counterDelta !== 0 &&
            (existing.followState === "self" || existing.userId === currentUser?.userId)
          ) {
            next = {
              ...next,
              followingCount: Math.max(0, next.followingCount + result.counterDelta),
            };
          }

          return next;
        }
      );

      void queryClient.invalidateQueries({ queryKey: authKeys.me() });
      void queryClient.invalidateQueries({ queryKey: profileKeys.detail(input.username) });
      void queryClient.invalidateQueries({ queryKey: profileKeys.followers(input.username) });

      if (currentUser?.username) {
        void queryClient.invalidateQueries({
          queryKey: profileKeys.detail(currentUser.username),
        });
        void queryClient.invalidateQueries({
          queryKey: profileKeys.following(currentUser.username),
        });
      }
    },
    onSettled: function () {
      return void queryClient.invalidateQueries({ queryKey: suggestionsKeys.all });
    },
  });
}
