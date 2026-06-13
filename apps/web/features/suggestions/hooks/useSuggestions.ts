import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { followUser, unfollowUser } from "@/features/profile/api/profileApi";
import type { SuggestionsResponse } from "@35mm/types";
import { fetchPeopleSuggestions } from "../api/suggestionsApi";
import { suggestionsKeys } from "./queryKeys";

type SuggestionListParams = {
  limit?: number;
  cursor?: string;
};

export type SuggestionsFollowPayload = {
  userId: string;
  isFollowing: boolean;
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

  return useMutation<void, Error, SuggestionsFollowPayload>({
    mutationFn: async function (input) {
      var token = await getToken();
      if (input.isFollowing) {
        await unfollowUser(input.userId, token);
        return;
      }

      await followUser(input.userId, token);
    },
    onSettled: function () {
      return void queryClient.invalidateQueries({ queryKey: suggestionsKeys.all });
    },
  });
}
